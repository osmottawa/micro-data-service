import * as debug from 'debug'

export default {
  configs: debug('mds:configs'),
  error: debug('mds:error'),
  info: debug('mds:info'),
  server: debug('mds:server'),
  warning: debug('mds:warning'),
  download: debug('mds:download'),
}
