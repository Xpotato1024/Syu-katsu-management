type TermsDialogProps = {
  open: boolean
  onClose: () => void
}

export function TermsDialog({ open, onClose }: TermsDialogProps) {
  if (!open) return null

  return (
    <div className="terms-backdrop" role="presentation" onClick={onClose}>
      <section
        className="terms-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="terms-head">
          <h2 id="terms-title">利用規約</h2>
          <button type="button" className="button-secondary" onClick={onClose}>
            閉じる
          </button>
        </header>

        <div className="terms-content">
          <section className="terms-section">
            <h3>第1条（適用）</h3>
            <p>本規約は、就活フロー管理アプリ（以下「本サービス」）の利用に関する条件を定めるものです。</p>
          </section>

          <section className="terms-section">
            <h3>第2条（利用目的）</h3>
            <p>
              本サービスは就職活動に関する情報整理を目的として提供されます。選考結果や外部リンク先情報の正確性、完全性、最新性を保証しません。
            </p>
          </section>

          <section className="terms-section">
            <h3>第3条（アカウントとデータ管理）</h3>
            <p>
              利用者は自己の責任でアカウント情報および入力データを管理するものとします。重要データは利用者自身でバックアップを取得してください。
            </p>
          </section>

          <section className="terms-section">
            <h3>第4条（禁止事項）</h3>
            <p>法令違反行為、不正アクセス、サービス運用を妨げる行為、公序良俗に反する利用を禁止します。</p>
          </section>

          <section className="terms-section">
            <h3>第5条（免責）</h3>
            <p>
              本サービスの利用により生じた直接または間接の損害について、運営者は故意または重過失がある場合を除き責任を負いません。
            </p>
          </section>

          <section className="terms-section">
            <h3>第6条（規約変更）</h3>
            <p>
              本規約は、必要に応じて予告なく改定されることがあります。改定後の規約は、本サービス上に表示された時点で効力を生じます。
            </p>
          </section>
        </div>
      </section>
    </div>
  )
}
