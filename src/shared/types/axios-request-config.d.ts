import 'axios'

declare module 'axios' {
  interface AxiosRequestConfig<D = any> {
    silentErrorToast?: boolean
    silentTimeoutToast?: boolean
    silentNetworkToast?: boolean
  }
}
