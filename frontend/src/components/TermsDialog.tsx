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
            <h3>総則</h3>
            <p>
              本利用規約（以下「本規約」）は、xpotato.net が提供する「就活マネジメント」（以下「本サービス」）の利用条件を定めるものです。
              利用者は本規約に同意のうえ本サービスを利用するものとします。
            </p>
            <p className="terms-meta">最終改定日: 2026-03-06</p>
          </section>

          <section className="terms-section">
            <h3>第1条（適用）</h3>
            <p>
              本規約は、本サービスの提供条件および運営者と利用者の権利義務関係を定めることを目的とし、利用者と運営者の間の本サービス利用に関わる
              一切の関係に適用されます。
            </p>
          </section>

          <section className="terms-section">
            <h3>第2条（提供形態・運用方針）</h3>
            <p>
              本サービスは、個人運用基盤（自宅サーバー・VPS 等）を含む構成で、ベストエフォートにより提供されます。運営者は商用SLA
              相当の可用性保証を行いません。
            </p>
            <ul className="terms-list">
              <li>計画メンテナンスまたは緊急対応により、事前通知なく機能停止・遅延が発生する場合があります。</li>
              <li>セキュリティ対策・負荷対策のため、接続制限や構成変更を行う場合があります。</li>
            </ul>
          </section>

          <section className="terms-section">
            <h3>第3条（利用目的）</h3>
            <p>
              本サービスは就職活動に関する情報整理を目的として提供されます。選考結果や外部リンク先情報の正確性、完全性、最新性を保証しません。
            </p>
          </section>

          <section className="terms-section">
            <h3>第4条（アカウント・認証）</h3>
            <p>
              本サービスは、運営者が指定する認証方式（例: Authelia 連携、ローカル認証）により利用者を識別します。利用者は認証情報を
              自己の責任で管理し、不正利用防止に必要な措置を講じるものとします。
            </p>
          </section>

          <section className="terms-section">
            <h3>第5条（データ取扱い・バックアップ）</h3>
            <p>
              運営者は運用上必要な範囲でデータ保全（例: 定期バックアップ）に努めますが、データ消失・破損が生じないことを保証しません。
            </p>
            <ul className="terms-list">
              <li>重要データは利用者自身で定期的にバックアップを取得してください。</li>
              <li>障害復旧時、直近時点への完全復元を保証しません。</li>
              <li>運用・監査・障害解析のため、アクセスログ等を必要最小限で記録する場合があります。</li>
            </ul>
          </section>

          <section className="terms-section">
            <h3>第6条（禁止事項）</h3>
            <p>利用者は、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
            <ul className="terms-list">
              <li>法令または公序良俗に反する行為</li>
              <li>不正アクセス、認証回避、脆弱性の悪用、またはこれらを試みる行為</li>
              <li>本サービスまたは関連システムへ過度な負荷を与える行為</li>
              <li>第三者の権利・利益を侵害する行為</li>
              <li>運営者が不適切と合理的に判断する行為</li>
            </ul>
          </section>

          <section className="terms-section">
            <h3>第7条（知的財産）</h3>
            <p>
              本サービスに関するプログラム、ドキュメント、画面デザイン等の知的財産権は、運営者または正当な権利者に帰属します。
              OSSライセンス対象部分は、当該ライセンス条件に従います。
            </p>
          </section>

          <section className="terms-section">
            <h3>第8条（免責）</h3>
            <p>
              運営者は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定目的適合性、セキュリティ等） が
              ないことを保証しません。
            </p>
            <p>
              本サービス利用に起因して利用者に生じた損害について、運営者は故意または重過失がある場合を除き責任を負いません。
              なお、運営者が責任を負う場合であっても、通常かつ直接の損害を上限とします。
            </p>
          </section>

          <section className="terms-section">
            <h3>第9条（サービス変更・停止）</h3>
            <p>
              運営者は、運用上または技術上の必要に応じて、本サービスの全部または一部を変更・中断・終了できるものとします。
              これにより利用者に生じた不利益・損害について、運営者は前条の範囲でのみ責任を負います。
            </p>
          </section>

          <section className="terms-section">
            <h3>第10条（規約変更）</h3>
            <p>
              本規約は、必要に応じて予告なく改定されることがあります。改定後の規約は、本サービス上に表示された時点で効力を生じます。
            </p>
          </section>

          <section className="terms-section">
            <h3>第11条（準拠法・管轄）</h3>
            <p>
              本規約の準拠法は日本法とします。本サービスに関して紛争が生じた場合、運営者所在地を管轄する裁判所を第一審の専属的合意管轄とします。
            </p>
          </section>
        </div>
      </section>
    </div>
  )
}
