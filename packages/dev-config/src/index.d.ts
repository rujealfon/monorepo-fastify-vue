export function localDevelopmentTransport(start: string): {
  certificatePath: string
  hasCertificate: boolean
  keyPath: string
  protocol: 'http' | 'https'
  readHttps: () => { key: Buffer, cert: Buffer } | undefined
}
