import pageFinderFactory from "./find-page"
import emitter from "./emitter"

const preferDefault = m => (m && m.default) || m

let prefetcher
let inInitialRender = true
let hasFetched = Object.create(null)
let syncRequires = {}
let asyncRequires = {}

const fetchResource = resourceName => {
  // Find resource
  let resourceFunction
  if (resourceName.slice(0, 12) === `component---`) {
    resourceFunction = asyncRequires.components[resourceName]
  } else if (resourceName.slice(0, 9) === `layout---`) {
    resourceFunction = asyncRequires.layouts[resourceName]
  } else {
    resourceFunction = asyncRequires.json[resourceName]
  }

  // Download the resource
  hasFetched[resourceName] = true
  return resourceFunction()
}

const getResourceModule = resourceName =>
  fetchResource(resourceName).then(preferDefault)

// Prefetcher logic
if (process.env.NODE_ENV === `production`) {
  prefetcher = require(`./prefetcher`)({
    fetchNextResource: () => {
      let next = queue.dequeue()
      return next && fetchResource(next)
    },
  })

  emitter.on(`onPreLoadPageResources`, e => {
    prefetcher.onPreLoadPageResources(e)
  })
  emitter.on(`onPostLoadPageResources`, e => {
    prefetcher.onPostLoadPageResources(e)
  })
}

// Note we're not actively using the path data atm. There
// could be future optimizations however around trying to ensure
// we load all resources for likely-to-be-visited paths.
// let pathArray = []
// let pathCount = {}

let resourcesCount = Object.create(null)
const sortResourcesByCount = (a, b) => {
  if (resourcesCount[a] > resourcesCount[b]) return 1
  else if (resourcesCount[a] < resourcesCount[b]) return -1
  else return 0
}

let findPage
let pages = []
let pathScriptsCache = {}
let resourcesArray = []
let mountOrder = 1

const queue = {
  empty: () => {
    resourcesCount = Object.create(null)
    resourcesArray = []
    pages = []
  },

  addPagesArray: newPages => {
    pages = newPages
    let pathPrefix = ``
    if (typeof __PREFIX_PATHS__ !== `undefined`) {
      pathPrefix = __PATH_PREFIX__
    }
    findPage = pageFinderFactory(newPages, pathPrefix)
  },
  addDevRequires: devRequires => {
    syncRequires = devRequires
  },
  addProdRequires: prodRequires => {
    asyncRequires = prodRequires
  },

  dequeue: () => resourcesArray.pop(),

  // dequeue: path => pathArray.pop(),

  enqueue: path => {
    // Check page exists.
    if (!pages.some(p => p.path === path)) {
      return false
    }

    const mountOrderBoost = 1 / mountOrder
    mountOrder += 1

    function enqueueResource(resourceName) {
      if (!resourceName) return
      if (!resourcesCount[resourceName]) {
        resourcesCount[resourceName] = 1 + mountOrderBoost
      } else {
        resourcesCount[resourceName] += 1 + mountOrderBoost
      }

      // Before adding, checking that the resource isn't either
      // already queued or been downloading.
      if (hasFetched[resourceName] || resourcesArray.includes(resourceName))
        return

      resourcesArray.unshift(resourceName)
    }

    // Add resources to queue.
    const page = findPage(path)

    enqueueResource(page.jsonName)
    enqueueResource(page.componentChunkName)

    // Sort resources by resourcesCount.
    resourcesArray.sort(sortResourcesByCount)

    if (process.env.NODE_ENV === `production`) {
      prefetcher.onNewResourcesAdded()
    }

    return true
  },

  getPage: pathname => findPage(pathname),

  getResourcesForPathname: (path, cb = () => {}) => {
    if (
      inInitialRender &&
      navigator &&
      navigator.serviceWorker &&
      navigator.serviceWorker.controller &&
      navigator.serviceWorker.controller.state === `activated`
    ) {
      // If we're loading from a service worker (it's already activated on
      // this initial render) and we can't find a page, there's a good chance
      // we're on a new page that this (now old) service worker doesn't know
      // about so we'll unregister it and reload.
      if (!findPage(path)) {
        navigator.serviceWorker
          .getRegistrations()
          .then(function(registrations) {
            // We would probably need this to
            // prevent unnecessary reloading of the page
            // while unregistering of ServiceWorker is not happening
            if (registrations.length) {
              for (let registration of registrations) {
                registration.unregister()
              }
              window.location.reload()
            }
          })
      }
    }
    inInitialRender = false
    // In development we know the code is loaded already
    // so we just return with it immediately.
    if (process.env.NODE_ENV !== `production`) {
      const page = findPage(path)
      if (!page) return cb()
      const pageResources = {
        component: syncRequires.components[page.componentChunkName],
        json: syncRequires.json[page.jsonName],
        layout: syncRequires.layouts[page.layout],
        page,
      }
      cb(pageResources)
      return pageResources
    }
    // Production code path
    const page = findPage(path)

    if (!page) {
      console.log(`A page wasn't found for "${path}"`)
      return null
    }

    // Use the path from the page so the pathScriptsCache uses
    // the normalized path.
    path = page.path

    // Check if it's in the cache already.
    if (pathScriptsCache[path]) {
      Promise.resolve().then(() => {
        cb(pathScriptsCache[path])
        emitter.emit(`onPostLoadPageResources`, {
          page,
          pageResources: pathScriptsCache[path],
        })
      })
      return pathScriptsCache[path]
    }

    emitter.emit(`onPreLoadPageResources`, { path })

    Promise.all([
      getResourceModule(page.componentChunkName),
      getResourceModule(page.jsonName),
      page.layout && getResourceModule(page.layout),
    ]).then(([component, json, layout]) => {
      const pageResources = { component, json, layout, page }

      pathScriptsCache[path] = pageResources
      cb(pageResources)

      emitter.emit(`onPostLoadPageResources`, {
        page,
        pageResources,
      })
    })

    return null
  },

  // for testing
  ___resources: () => resourcesArray.slice().reverse(),
}

export const publicLoader = {
  getResourcesForPathname: queue.getResourcesForPathname,
}

export default queue
