import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express'


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isTest = process.env.VITEST;

const createServer = async (root = process.cwd(), isProd = process.env.NODE_ENV === 'production', hmrPort) => {
    const resolve = (p) => path.resolve(__dirname, p);
    const indexProd = isProd ? readFileSync("dist/client/index.html", 'utf-8') : '';
    
    const app = express();
    let vite;
    console.log("mode build is prod", isProd);
    if (!isProd) {
        vite = await (await import('vite')).createServer({
            root, 
            logLevel: isTest ? 'error' : 'info', 
            server: { 
                middlewareMode: true, 
                watch: { 
                    usePolling: true, 
                    interval: 100
                },
                hmr: { 
                    port: hmrPort
                }
            },
            appType: 'custom'
        });

        app.use(vite.middlewares);
    } else {
        app.use((await import('compression')).default());
        app.use((await import('serve-static')).default(resolve('dist/client'), { index: false }));
    }

    app.use('*', async (req, res, next) => {
        try {
            const url = req.originalUrl;
            let template;
            let render;
            // 1. Read index.html
            // let template = readFileSync(
            //     path.resolve(__dirname, 'index.html'),
            //     'utf-8'
            // )
            // 3. Load the server entry. vite.ssrLoadModule automatically transforms
            //    your ESM source code to be usable in Node.js! There is no bundling
            //    required, and provides efficient invalidation similar to HMR.
            // const { render } = await vite.ssrLoadModule('/src/entry-server.jsx')

            // 4. render the app HTML. This assumes entry-server.js's exported `render`
            //    function calls appropriate framework SSR APIs,
            //    e.g. ReactDOMServer.renderToString()
            // const appHtml = await render(url)

            // 5. Inject the app-rendered HTML into the template.
            // const html = template.replace(`<!--ssr-outlet-->`, appHtml)

            if (!isProd) {
                 // always read fresh template in dev
                template = readFileSync(resolve('index.html'), 'utf-8')
                // template = await vite.transformIndexHtml(url, template)
                render = (await vite.ssrLoadModule('/src/entry-server.jsx')).render
            } else {
                template = indexProd;
                // @ts-ignore
                render = (await import('./dist/server/entry-server.js')).render
            }
            const appHtml = render(url);
            const html = template.replace(`<!--app-html-->`, appHtml)

            res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
        } catch (e) {
            !isProd && vite.ssrFixStacktrace(e)
            console.log(e.stack)
            res.status(500).end(e.stack)
        }
    })
    
    // @ts-ignore
    return { app, vite }
}

if (!isTest) {
    createServer().then(({ app }) =>
      app.listen(5173, () => {
        console.log('http://localhost:5173')
      })
    )
  }