import path from 'path'
import Express from 'express'

import React from 'react'
import { renderToString } from 'react-dom/server'
import { Provider } from 'react-redux'
import { match, RouterContext } from 'react-router'

import configureStore from '../common/configureStore'
import routes from '../common/routes'
import { fetchMenu } from '../common/middleware/api'

const app = new Express()
const port = 8080

app.use(Express.static(path.join(__dirname, '../dist')))

const createPage = (html, finalState) => {
  let preloadedState = finalState ? JSON.stringify(finalState).replace(/</g, '\\x3c') : undefined;

  return `
    <!doctype>
    <html>
      <head>
        <title>Example</title>
      </head>
      <body>
        <div id="app">${html}</div>
        <script id="preloaded-state">
          window.__PRELOADED_STATE__ = ${preloadedState}
        </script>
        <script src="bundle.js"></script>
      </body>
    </html>
  `
}

const handleRender = (req, res) => {
  match({ routes, location: req.originalUrl }, (err, redirectLocation, renderProps) => {
    if (err) {
      console.error(err);
      return res.status(500).end('Internal server error');
    }

    if (!renderProps)
      return res.status(404).end('Not found');

    if (redirectLocation)
      return res.redirect(302, redirectLocation.pathname + redirectLocation.search)

    fetchMenu()
      .catch(err => res.status(err.status).end(err.statusText))
      .then(menu => {
        const preloadedState = menu

        // Create a new Redux store instance
        const store = configureStore(preloadedState)

        // Render the component to a string
        const html = renderToString(
          <Provider store={store}>
            <RouterContext {...renderProps}/>
          </Provider>
        )

        // Grab the initial state from our Redux store
        const finalState = store.getState()

        // Send the rendered page back to the client
        res.send(createPage(html, finalState))
      })
  })
}

app.use(handleRender)

app.listen(port, (error) => {
  if (error) {
    console.error(error)
  } else {
    console.info(`Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`)
  }
})
