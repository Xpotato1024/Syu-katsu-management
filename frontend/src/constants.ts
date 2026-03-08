export const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api"
export const logoutURL = import.meta.env.VITE_LOGOUT_URL ?? ""
export const loginURL = import.meta.env.VITE_LOGIN_URL ?? ""
export const appName = "就活マネジメント"
export const appTitleEn = "Job Hunt Manager"
export const appByline = "by xpotato.net"
export const appVersion = import.meta.env.VITE_APP_VERSION ?? "v0.3.16-next"

export const companyStatusOptions = ["未着手", "選考中", "内定", "お見送り", "辞退"] as const
export const companyInterestOptions = ["未設定", "高", "中", "低"] as const
export const stepKindOptions = ["エントリー", "ES", "Webテスト", "GD", "面接", "面談", "説明会", "その他"] as const
export const stepStatusOptions = ["未着手", "予定", "実施済", "通過", "不通過", "辞退"] as const
export const weekdayShort = ["日", "月", "火", "水", "木", "金", "土"] as const

export const pendingStepStatuses = new Set(["未着手", "予定"])
export const completedStepStatuses = new Set(["実施済", "通過"])
export const stoppedStepStatuses = new Set(["不通過", "辞退"])
