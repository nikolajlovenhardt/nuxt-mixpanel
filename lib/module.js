const path = require('path')
const defaults = require('./defaults')
const { requireNuxtVersion } = require('./compatibility')

// doNotTrack polyfill
// https://gist.github.com/pi0/a76fd97c4ea259c89f728a4a8ebca741
const dnt = "(function(w,n,d,m,e,p){w[d]=(w[d]==1||n[d]=='yes'||n[d]==1||n[m]==1||(w[e]&&w[e][p]&&w[e][p]()))?1:0})(window,navigator,'doNotTrack','msDoNotTrack','external','msTrackingProtectionEnabled')"

module.exports = async function mixpanelModule (_options) {
  requireNuxtVersion(this.nuxt, '2.12.0')

  const options = {
    ...defaults,
    ..._options,
    ...this.options.mixpanel
  }

  this.addTemplate({
    src: path.resolve(__dirname, 'plugin.utils.js'),
    fileName: 'mixpanel.utils.js',
    options
  })

  if (!options.enabled) {
    // Register mock plugin
    this.addPlugin({
      src: path.resolve(__dirname, 'plugin.mock.js'),
      fileName: 'mixpanel.js',
      options
    })
    return
  }

  // Async id evaluation
  if (typeof (options.id) === 'function') {
    options.id = await options.id()
  }

  const injectScript = `(function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];a.toString=function(a){var d="mixpanel";"mixpanel"!==c&&(d+="."+c);a||(d+=" (stub)");return d};a.people.toString=function(){return a.toString(1)+".people (stub)"};i="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");
for(h=0;h<i.length;h++)g(a,i[h]);var j="set set_once union unset remove delete".split(" ");a.get_group=function(){function b(c){d[c]=function(){call2_args=arguments;call2=[c].concat(Array.prototype.slice.call(call2_args,0));a.push([e,call2])}}for(var d={},e=["get_group"].concat(Array.prototype.slice.call(arguments,0)),c=0;c<j.length;c++)b(j[c]);return d};b._i.push([e,f,c])};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===f.location.protocol&&"//${options.scriptURL}".match(/^\\/\\//)?"https://${options.scriptURL}":"//${options.scriptURL}";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}})(document,window.mixpanel||[]);`

  const doNotTrackScript = options.respectDoNotTrack
      ? 'if(w.doNotTrack||w[x][i])return;'
      : ''

  const autoInit = options.autoInit && options.id
    ? `mixpanel.init(${options.id});`
    : ''

  let script = `${dnt};(function () { ${doNotTrackScript} ${injectScript} ${autoInit} })()`

  // Guard against double IIFE executation in SPA mode (#3)
  script = `if(!window._mixpanel_init){window._mixpanel_init=1;${script}}`

  // Add google tag manager <script> to head
  if (typeof this.options.head === 'function') {
    // eslint-disable-next-line no-console
    console.warn('[@wonderfulday/nuxt-mixpanel] head is provided as a function which is not supported by this module at the moment. Removing user-provided head.')
    this.options.head = {}
  }
  this.options.head.script = this.options.head.script || []
  this.options.head.script.push({
    hid: options.scriptId,
    innerHTML: script
  })

  // Remove trailing slash to avoid duplicate slashes when appending route path
  const routerBase = this.options.router.base.replace(/\/+$/, '')

  // Register plugin
  this.addPlugin({
    src: path.resolve(__dirname, 'plugin.js'),
    fileName: 'mixpanel.js',
    options: {
      ...options,
      routerBase
    }
  })
}

module.exports.meta = require('../package.json')