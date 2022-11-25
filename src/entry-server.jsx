import reactDOMServer from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App'

export function render(url) {
    return reactDOMServer.renderToString(
        <StaticRouter location={url}>
            <App />
        </StaticRouter>
    )
}