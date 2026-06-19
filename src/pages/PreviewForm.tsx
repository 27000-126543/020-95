import { useState, useMemo, useEffect, useRef } from 'react'
import type { OcclusionFormData, IssueWithSeverity, MovementObservation, SpecialConcern, TechnicianIssue, IssueSeverity, TransferPackage } from '@/types/form'
import { formatDate, formatDateTime, validateForm, migrateFormData } from '@/utils/formUtils'
import { ISSUE_SEVERITY_MAP } from '@/constants/steps'
import { markAsSaved } from '@/utils/historyStore'
import { buildTransferPackage } from '@/utils/issueManager'
import type { FormStore } from '@/hooks/useFormStore'

interface PreviewFormProps {
  store: FormStore
  onBack: () => void
  onFillReceipt: () => void
  onBackToList: () => void
  focusSummary?: boolean
}

export function PreviewForm({ store, onBack, onFillReceipt, onBackToList, focusSummary }: PreviewFormProps) {
  const { formData, loadedFilePath, addReceipt, markSaved, setFormData } = store
  const [showSuccess, setShowSuccess] = useState<string>('')
  const [pkgNotes, setPkgNotes] = useState('')
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focusSummary && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focusSummary])

  const handlePrint = async () => {
    await window.electronAPI.printForm()
  }

  const handleSave = async () => {
    const validation = validateForm(formData)
    if (!validation.valid) {
      alert('请先完善必填项：\n' + validation.errors.join('\n'))
      return
    }

    const result = await window.electronAPI.savePackageForm(formData, loadedFilePath ? undefined : `咬合交接单_${formData.patientCode || '新病例'}_${new Date().toISOString().slice(0, 10)}.json`)
    if (result.success && result.filePath) {
      // 回读验证
      try {
        const rt = await window.electronAPI.loadFormByPath(result.filePath)
        if (rt.success && rt.data) {
          const normalized = migrateFormData(rt.data as OcclusionFormData)
          setFormData(normalized)
        }
      } catch {
        /* 回读失败不阻塞 */
      }
      markSaved(result.filePath)
      markAsSaved(formData.id || 'tmp-id', result.filePath, formData)
      setShowSuccess('✓ 文件已保存并验证：' + result.filePath)
      window.setTimeout(() => setShowSuccess(''), 4200)
    }
  }

  const handleExportPackage = async () => {
    const actorName = formData.dentistName || formData.clinicName || '诊所'
    const pkg = buildTransferPackage(formData, {
      actorType: 'clinic',
      actorName,
      contact: formData.clinicPhone,
      additionalNotes: pkgNotes.trim() || undefined
    })
    const r = await window.electronAPI.exportPackage(pkg)
    if (r.success && r.filePath) {
      setShowSuccess('✓ 交接包已导出：' + r.filePath)
      window.setTimeout(() => setShowSuccess(''), 4200)
      setPkgNotes('')
    }
  }

  const handleFillReceipt = () => {
    addReceipt()
    onFillReceipt()
  }

  const hasReceipt = !!formData.receipt
  const transferSource = (formData as unknown as { transferSource?: {
    type?: 'clinic' | 'lab'
    name?: string
    contact?: string
    exportedAt?: string
    importedAt?: string
    latestNotes?: string
  } }).transferSource

  const actionItems = useMemo(() => {
    if (!hasReceipt) return null
    const issues = formData.receipt!.issues.selected || []
    const bySeverity: Record<IssueSeverity, IssueWithSeverity[]> = {
      revisit: [],
      confirm: [],
      minor: []
    }
    issues.forEach((item: IssueWithSeverity) => {
      bySeverity[item.severity].push(item)
    })
    return {
      bySeverity,
      total: issues.length,
      needsReturn: formData.receipt!.requiresReturnVisit,
      returnReason: formData.receipt!.returnVisitReason
    }
  }, [formData, hasReceipt])

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = { '常规': 'badge-gray', '加急': 'badge-orange', '特急': 'badge-red' }
    return colors[priority] || 'badge-gray'
  }

  return (
    <div className="preview-form" id="print-content">
      <div className="form-header no-print">
        <div className="header-content">
          <button className="btn-link" onClick={onBackToList}>← 返回列表</button>
          <h1 className="form-title">交接单预览</h1>
          <p className="form-subtitle">
            {loadedFilePath ? `当前文件：${loadedFilePath}` : '请核对信息无误后保存或打印'}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onBack}>返回编辑</button>
          <button className="btn btn-secondary" onClick={handlePrint}>打印</button>
          <button className="btn btn-secondary" onClick={handleExportPackage} title="导出包含表单、回执、备注的 .ocp.json 交接包">
            📤 导出交接包
          </button>
          <button className="btn btn-primary" onClick={handleSave}>保存文件</button>
          {!hasReceipt && (
            <button className="btn btn-accent" onClick={handleFillReceipt}>填写技工回执</button>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="alert alert-success no-print">{showSuccess}</div>
      )}

      {transferSource && (
        <div className="pkg-source-bar no-print">
          <span>🔗 交接来源：</span>
          <strong>{transferSource.type === 'lab' ? '🏭 技工所' : '🏥 诊所'} — {transferSource.name || '未知'}</strong>
          {transferSource.exportedAt && <span>· 导出：{formatDateTime(transferSource.exportedAt)}</span>}
          {transferSource.importedAt && <span>· 本地导入：{formatDateTime(transferSource.importedAt)}</span>}
          {transferSource.contact && <span>· 联系方式：{transferSource.contact}</span>}
          {transferSource.latestNotes && <span>· 最近备注：<em style={{ color: 'var(--text-primary)' }}>"{transferSource.latestNotes}"</em></span>}
        </div>
      )}

      {(() => {
        const src = transferSource as { history?: TransferPackage['history'] } | undefined
        const history = src?.history
        if (!history || history.length === 0) return null
        return (
          <div className="transfer-history no-print" style={{
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.04)',
            borderRadius: '8px',
            marginBottom: '16px',
            borderLeft: '3px solid var(--color-primary)'
          }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>📜 流转历史</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              {history.map((h, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text-secondary)' }}>
                  <span style={{ opacity: 0.6, flexShrink: 0 }}>[{formatDateTime(h.time)}]</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{h.actor}</strong>
                  <span>{h.action}</span>
                  {h.note && <em>"{h.note}"</em>}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      <div className="preview-content">
        <div className="preview-header print-only">
          <h1 className="document-title">口腔修复咬合交接单</h1>
          <p className="document-subtitle">Dental Occlusion Registration Form</p>
        </div>

        {hasReceipt && actionItems && (actionItems.total > 0 || actionItems.needsReturn) && (
          <div className="action-summary no-print" ref={summaryRef}>
            <div className="action-summary-header">
              <h3>🔔 医生需处理汇总</h3>
              {actionItems.needsReturn && <span className="badge badge-red">⚠ 需要返诊</span>}
              <button className="btn-link btn-ghost" onClick={onBack} style={{ marginLeft: 'auto' }}>
                跳转编辑
              </button>
            </div>
            {(['revisit', 'confirm', 'minor'] as IssueSeverity[]).map(sev => {
              const list = actionItems.bySeverity[sev]
              if (list.length === 0) return null
              const info = ISSUE_SEVERITY_MAP[sev]
              return (
                <div key={sev} className={`action-group ${sev}`}>
                  <h4><span className={`badge ${info.badge}`}>{info.label}</span> ({list.length} 项)</h4>
                  <ul>
                    {list.map((item: IssueWithSeverity, idx: number) => (
                      <li key={idx}>{item.issue}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {actionItems.needsReturn && actionItems.returnReason && (
              <div className="action-group revisit return-reason">
                <h4><span className="badge badge-red">返诊原因</span></h4>
                <p>{actionItems.returnReason}</p>
              </div>
            )}
          </div>
        )}

        {hasReceipt ? null : (
          <div className="no-print" style={{ marginBottom: 20 }}>
            <div className="text-input-label" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              📝 交接备注（随导出的交接包发送，对方导入后可见）
            </div>
            <textarea
              className="text-input"
              rows={2}
              value={pkgNotes}
              onChange={e => setPkgNotes(e.target.value)}
              placeholder="如：本次修复为二次印模，请优先安排制作；任何疑问请联系王医生 138xxxxxx。"
              style={{ width: '100%', minHeight: 60 }}
            />
          </div>
        )}

        <div className="preview-section">
          <h2 className="preview-section-title">基本信息</h2>
          <div className="preview-grid">
            <div className="preview-item"><span className="preview-label">患者代号：</span><span className="preview-value">{formData.patientCode || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">性别：</span><span className="preview-value">{formData.patientGender || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">年龄：</span><span className="preview-value">{formData.patientAge || '-'} 岁</span></div>
            <div className="preview-item"><span className="preview-label">修复类型：</span><span className="preview-value">{formData.restorationType || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">主治医生：</span><span className="preview-value">{formData.dentistName || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">诊所名称：</span><span className="preview-value">{formData.clinicName || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">联系电话：</span><span className="preview-value">{formData.clinicPhone || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">填写日期：</span><span className="preview-value">{formatDate(formData.fillDate)}</span></div>
            <div className="preview-item"><span className="preview-label">优先级：</span><span className={`badge ${getPriorityBadge(formData.priority)}`}>{formData.priority}</span></div>
            <div className="preview-item"><span className="preview-label">预计交付：</span><span className="preview-value">{formatDate(formData.estimatedDeliveryDate)}</span></div>
          </div>
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">垂直距离记录 (mm)</h2>
          <div className="preview-grid">
            <div className="preview-item"><span className="preview-label">息止颌位：</span><span className="preview-value">{formData.verticalDistance.restPosition || '-'} mm</span></div>
            <div className="preview-item"><span className="preview-label">咬合位：</span><span className="preview-value">{formData.verticalDistance.occlusalPosition || '-'} mm</span></div>
            <div className="preview-item"><span className="preview-label">息止颌间隙：</span><span className="preview-value">{formData.verticalDistance.freeWaySpace || '-'} mm</span></div>
          </div>
          {formData.verticalDistance.notes && (
            <div className="preview-notes"><span className="preview-label">备注：</span><span>{formData.verticalDistance.notes}</span></div>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">颌位记录方式</h2>
          <div className="preview-grid">
            <div className="preview-item"><span className="preview-label">记录方法：</span><span className="preview-value">{formData.jawRecord.method || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">记录次数：</span><span className="preview-value">{formData.jawRecord.attempts || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">颌位稳定性：</span><span className="preview-value">{formData.jawRecord.stability || '-'}</span></div>
          </div>
          {formData.jawRecord.notes && (
            <div className="preview-notes"><span className="preview-label">记录过程说明：</span><span>{formData.jawRecord.notes}</span></div>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">咬合平面参考</h2>
          <div className="preview-grid">
            <div className="preview-item"><span className="preview-label">参考标志：</span><span className="preview-value">{formData.occlusalPlane.reference || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">上颌前牙高度：</span><span className="preview-value">{formData.occlusalPlane.maxillaryAnteriorHeight || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">下颌前牙高度：</span><span className="preview-value">{formData.occlusalPlane.mandibularAnteriorHeight || '-'}</span></div>
          </div>
          {formData.occlusalPlane.notes && (
            <div className="preview-notes"><span className="preview-label">备注：</span><span>{formData.occlusalPlane.notes}</span></div>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">前伸侧方运动观察</h2>
          {formData.movement.observations.length > 0 && (
            <div className="preview-tags">
              {formData.movement.observations.map((obs: MovementObservation, idx: number) => (
                <span key={idx} className="tag tag-blue">{obs}</span>
              ))}
            </div>
          )}
          <div className="preview-grid">
            <div className="preview-item"><span className="preview-label">前伸髁道斜度：</span><span className="preview-value">{formData.movement.protrusivePath || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">侧方髁道斜度：</span><span className="preview-value">{formData.movement.lateralPath || '-'}</span></div>
          </div>
          {formData.movement.notes && (
            <div className="preview-notes"><span className="preview-label">运动功能备注：</span><span>{formData.movement.notes}</span></div>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">医生特别关注点</h2>
          {formData.specialConcerns.selected.length > 0 && (
            <div className="preview-tags">
              {formData.specialConcerns.selected.map((concern: SpecialConcern, idx: number) => (
                <span key={idx} className="tag tag-orange">{concern}</span>
              ))}
            </div>
          )}
          {formData.specialConcerns.additionalNotes && (
            <div className="preview-notes"><span className="preview-label">其他特别说明：</span><span>{formData.specialConcerns.additionalNotes}</span></div>
          )}
          {formData.specialConcerns.selected.length === 0 && !formData.specialConcerns.additionalNotes && (
            <p className="preview-empty">无特别关注点</p>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">送检材料</h2>
          <div className="preview-grid">
            <div className="preview-item"><span className="preview-label">印模材料：</span><span className="preview-value">{formData.materials.impressionType || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">咬合记录材料：</span><span className="preview-value">{formData.materials.biteRegistrationMaterial || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">模型类型：</span><span className="preview-value">{formData.materials.modelType || '-'}</span></div>
            <div className="preview-item"><span className="preview-label">附加材料：</span>
              <span className="preview-value">
                {formData.materials.includesOldDenture && '旧义齿'}
                {formData.materials.includesOldDenture && formData.materials.includesFacebow && '、'}
                {formData.materials.includesFacebow && '面弓转移记录'}
                {!formData.materials.includesOldDenture && !formData.materials.includesFacebow && '-'}
              </span>
            </div>
          </div>
          {formData.materials.notes && (
            <div className="preview-notes"><span className="preview-label">材料备注：</span><span>{formData.materials.notes}</span></div>
          )}
        </div>

        <div className="preview-section signature-section">
          <div className="signature-block"><span className="preview-label">医生签名：</span><span className="signature-line">{formData.dentistSignature || '____________________'}</span></div>
          <div className="signature-block"><span className="preview-label">日期：</span><span className="signature-line">{formatDate(formData.fillDate)}</span></div>
        </div>

        {formData.notes && (
          <div className="preview-notes" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: 12, marginTop: 16 }}>
            <span className="preview-label">整体备注：</span><span>{formData.notes}</span>
          </div>
        )}

        {formData.createdAt && (
          <div className="preview-meta print-only">
            <p>创建时间：{formatDateTime(formData.createdAt)}</p>
            {formData.updatedAt && <p>更新时间：{formatDateTime(formData.updatedAt)}</p>}
          </div>
        )}

        {hasReceipt && (
          <>
            <div className="preview-divider" />
            <PreviewReceipt formData={formData} />
          </>
        )}
      </div>

      <div className="form-footer no-print">
        <button className="btn btn-secondary" onClick={onBack}>返回编辑</button>
        <div className="footer-actions">
          <button className="btn btn-secondary" onClick={handleExportPackage} title="导出 .ocp.json 交接包">
            📤 导出交接包
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>打印交接单</button>
          <button className="btn btn-primary" onClick={handleSave}>保存文件</button>
        </div>
      </div>
    </div>
  )
}

function PreviewReceipt({ formData }: { formData: OcclusionFormData }) {
  const receipt = formData.receipt!
  const issues = receipt.issues.selected || []

  const grouped = useMemo(() => {
    const g: Record<IssueSeverity, IssueWithSeverity[]> = { revisit: [], confirm: [], minor: [] }
    issues.forEach((i: IssueWithSeverity) => g[i.severity].push(i))
    return g
  }, [issues])

  return (
    <div className="preview-section receipt-section">
      <div className="receipt-header">
        <h2 className="preview-section-title">技工回执</h2>
        <span className="badge badge-teal">已回执</span>
      </div>

      <div className="preview-grid">
        <div className="preview-item"><span className="preview-label">技工所：</span><span className="preview-value">{receipt.labName || '-'}</span></div>
        <div className="preview-item"><span className="preview-label">技师：</span><span className="preview-value">{receipt.technicianName || '-'}</span></div>
        <div className="preview-item"><span className="preview-label">收到日期：</span><span className="preview-value">{formatDate(receipt.receivedDate)}</span></div>
        <div className="preview-item"><span className="preview-label">模型状况：</span><span className="preview-value">{receipt.modelCondition || '-'}</span></div>
        <div className="preview-item"><span className="preview-label">预计完成：</span><span className="preview-value">{formatDate(receipt.estimatedCompletionDate)}</span></div>
        <div className="preview-item"><span className="preview-label">需返诊：</span>
          <span className={`badge ${receipt.requiresReturnVisit ? 'badge-red' : 'badge-green'}`}>
            {receipt.requiresReturnVisit ? '是' : '否'}
          </span>
        </div>
      </div>

      {issues.length > 0 && (
        <>
          <h3 className="preview-subtitle">发现问题（按严重程度）</h3>
          {(['revisit', 'confirm', 'minor'] as IssueSeverity[]).map(sev => {
            if (grouped[sev].length === 0) return null
            const info = ISSUE_SEVERITY_MAP[sev]
            return (
              <div key={sev} className="issues-tier">
                <h4><span className={`badge ${info.badge}`}>{info.label}</span></h4>
                <div className="preview-tags">
                  {grouped[sev].map((item: IssueWithSeverity, idx: number) => (
                    <span key={idx} className={`tag ${sev === 'revisit' ? 'tag-red' : sev === 'confirm' ? 'tag-orange' : 'tag-blue'}`}>
                      {item.issue as TechnicianIssue}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}

      {receipt.issues.details && (
        <div className="preview-notes"><span className="preview-label">问题详情：</span><span>{receipt.issues.details}</span></div>
      )}

      {receipt.requiresReturnVisit && receipt.returnVisitReason && (
        <div className="preview-notes warning">
          <span className="preview-label">返诊原因：</span>
          <span className="text-red">{receipt.returnVisitReason}</span>
        </div>
      )}

      {receipt.specialInstructions && (
        <div className="preview-notes"><span className="preview-label">特别说明：</span><span>{receipt.specialInstructions}</span></div>
      )}

      <div className="preview-section signature-section">
        <div className="signature-block"><span className="preview-label">技师签名：</span><span className="signature-line">{receipt.technicianSignature || '____________________'}</span></div>
        {receipt.receiptCreatedAt && (
          <div className="signature-block"><span className="preview-label">回执日期：</span><span className="signature-line">{formatDateTime(receipt.receiptCreatedAt)}</span></div>
        )}
      </div>
    </div>
  )
}
