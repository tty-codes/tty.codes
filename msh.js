/*<script>document.body.bgColor='black';</script><script>/**/msh();
function msh(lead) {
  let xtermCSS, codemirrorCSS;

  function polyfill(glob) {

    function definePromise() {
      function Promise() { }
      return Promise;
    }

    if (typeof glob.Promise !== 'function') {
      glob.Promise = /** @type {*} */(definePromise());
    }
  }

  function boot() {
    if (msh.alreadyStarted) return;

    msh.alreadyStarted = true;
    polyfill((function () { return this; })());

    if (typeof WScript !== 'undefined' && WScript) {
      fromWScript();
    }
    else if (typeof require === 'function' && typeof process !== 'undefined' && process && process.argv && process.argv.length > 0) {
      fromNode();
    }
    else if (typeof window !== 'undefined' && window && typeof window.alert === 'function') {
      fromBrowser();
    }

    function fromNode() {

      function findBrowsers() {
        if (process.platform === 'win32') return findBrowsersWin32();
        else if (process.platform === 'darwin') return findBrowsersOSX();
        else if (process.platform === 'android') return findBrowsersAndroid();
        else return findBrowsersUnix();

        async function* findBrowsersWin32() {
        }

        async function* findBrowsersOSX() {
        }

        async function* findBrowsersAndroid() {
        }

        async function* findBrowsersUnix() {
        }
      }

      async function runAsMain() {
        const fs = require('fs');
        const path = require('path');
        const child_process = require('child_process');

        for await (let path of findBrowsers()) {
          if (fs.existsSync(path)) {
            // TODO: keep it?
            console.log('Found browser ' + path);
          }
        }

        build(
          dir => {
            try {
              return fs.readdirSync(path.resolve(__dirname, dir));
            }
            catch (error) {
              return null;
            }
          },
          file => {
            try {
              return fs.readFileSync(path.resolve(__dirname, file)) + '';
            }
            catch (error) {
              return null;
            }
          }
        );

        const httpServer = hostHttpServer();
        console.log('HTTP server hosted on http://' + httpServer.hostname + ':' + httpServer.port + '/ ...');

      }

      function hostHttpServer() {
        const fs = require('fs');
        const path = require('path');
        const http = require('http');
        const server = http.createServer(handleHttpRequest);
        let port = derivePort();
        let hostname = 'localhost';
        server.listen(port, hostname);
        return { server, port, hostname };

        function derivePort() {
          return 6425;
        }

        /**
         * @param {import('http').IncomingMessage} req
         * @param {import('http').ServerResponse} res
         */
        function handleHttpRequest(req, res) {
          res.setHeader('Content-Type', 'text/html');
          res.end(
            '/*<' + 'script>document.body.bgColor=\'black\';</' + 'script><'+'script>/**/msh();\n' +
            msh +
            '// </' + 'script>'
          );
        }
      }

      function runAsRequiredModule() {
        module.exports = msh;
      }

      if (require.main === module) {
        return runAsMain();
      }
      else {
        runAsRequiredModule();
      }
    }

    function fromBrowser() {
      function removeStrayContent() {
        const thisScript = document.scripts[document.scripts.length - 1];
        const remove = [];
        for (const topParent of [document.head || document.getElementsByTagName('head')[0], document.body]) {
          for (const f of topParent.childNodes) {
            if (f === thisScript) continue;
            if (f.nodeType === 3 /* text */ || f.nodeType === 1) remove.push(f);
          }
        }

        for (const f of remove) {
          f.parentElement.removeChild(f);
        }
      }

      removeStrayContent();

      const xtermStyles = document.createElement('style');
      xtermStyles.innerHTML = xtermCSS;
      document.body.appendChild(xtermStyles);

      const codemirrorStyles = document.createElement('style');
      codemirrorStyles.innerHTML = codemirrorCSS;
      document.body.appendChild(codemirrorStyles);

      var termHome = document.createElement('div');
      termHome.style.cssText = 'width: 100%; height: 100%; position: absolute; left: 0; top: 0;'
      document.body.appendChild(termHome);

      var term = new (/** @type {typeof import('xterm').Terminal} */(Terminal))({
        cursorBlink: true,
        windowOptions: {
          fullscreenWin: true
        }
      });

      for (const adnName of ['FitAddon', 'SearchAddon', 'SerializeAddon', 'Unicode11Addon', 'WebLinksAddon']) {
        let Adn = window[adnName];
        if (Adn[adnName]) {
          window[adnName] = Adn = Adn[adnName];
        }
        term.loadAddon(new Adn());
      }

      term.open(termHome);
      setTimeout(() => {
        const prompt = () => {
          term.write('\r\n$ ');
        };

        prompt();

        term.onKey((e) => {
          const ev = e.domEvent;
          const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

          if (ev.keyCode === 13) {
            prompt();
          } else if (ev.keyCode === 8) {
            // Do not delete the prompt
            if (term._core.buffer.x > 2) {
              term.write('\b \b');
            }
          } else if (printable) {
            term.write(e.key);
          }
        });

        term.focus();
      }, 100);
    }

    function fromWScript() {
    }

  }

  /**
   * @param {(dir: string) => (null | string[])} readDir 
   * @param {(file: string) => (null | string)} readFile 
   */
  function build(readDir, readFile) {

    function importFile(module) {
      const file =
        typeof require === 'function' && typeof require.resolve === 'function' ? require.resolve(module) :
          module.indexOf('/') > 0 ? './node_modules/' + module.split('.')[0] + '/' + module :
            './node_modules/' + module + '/lib/' + module + '.js';
      return readFile(file);
    }
    const xtermJS = importFile('xterm');
    xtermCSS = importFile('xterm/css/xterm.css');
    const xtermAddons = [
      'xterm-addon-fit',
      'xterm-addon-search',
      'xterm-addon-serialize',
      'xterm-addon-unicode11',
      'xterm-addon-web-links'
    ].map(importFile);

    const codemirrorJS = importFile('codemirror');
    codemirrorCSS = importFile('codemirror/lib/codemirror.css');

    const mshStr = msh.toString();
    const mshRebuilt = mshStr.replace(
      dependenciesStartMarkerRegExp,
      () => {
        return 'const dependenciesStart' + 'Marker' + 'RegExp =' + dependenciesStartMarkerRegExp + ';\n' +
          '\n' +
          '// xterm\n' +
          xtermJS + '\n' +
          'xtermCSS = ' + JSON.stringify(xtermCSS) + ';\n' +
          '\n' +
          xtermAddons.join('\n') + '\n' +

          '// codemirror\n' +
          codemirrorJS + '\n' +
          'codemirrorCSS = ' + JSON.stringify(codemirrorCSS) + ';\n' +
          '\n' +
          'boot' + '();\n' +
          '}';
      });
    
    if (mshRebuilt !== mshStr) {
      msh.toString = () => mshRebuilt;
    }
  }

  const dependenciesStartMarkerRegExp = /const dependenciesStartMarkerRegExp = [^\r\n]*\n([\s\S]+)boot\(\);[\r\n\s]*\}[\r\n\s]*$/;

  boot();
}
// </script>