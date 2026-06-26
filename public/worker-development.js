/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./worker/index.js":
/*!*************************!*\
  !*** ./worker/index.js ***!
  \*************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval(__webpack_require__.ts("/* eslint-disable */ // Custom service worker importado pelo next-pwa no sw.js gerado.\n// Responsável por exibir Web Push na barra de notificações do sistema\n// (mesmo com o PWA fechado/minimizado ou a tela bloqueada) e atualizar\n// o contador no ícone do app (Badging API).\nself.addEventListener(\"push\", (event)=>{\n    let payload = {};\n    try {\n        payload = event.data ? event.data.json() : {};\n    } catch (e) {\n        payload = {\n            title: \"Listaê\",\n            body: event.data ? event.data.text() : \"\"\n        };\n    }\n    const title = payload.title || \"Listaê\";\n    const url = payload.url || \"/\";\n    const options = {\n        body: payload.body || \"\",\n        icon: payload.icon || \"/icon-192.png\",\n        badge: \"/icon-192.png\",\n        tag: payload.tag || \"listae\",\n        renotify: true,\n        data: {\n            url\n        }\n    };\n    const tasks = [\n        self.registration.showNotification(title, options)\n    ];\n    if (typeof payload.badge === \"number\" && self.navigator && self.navigator.setAppBadge) {\n        if (payload.badge > 0) {\n            tasks.push(self.navigator.setAppBadge(payload.badge).catch(()=>{}));\n        } else if (self.navigator.clearAppBadge) {\n            tasks.push(self.navigator.clearAppBadge().catch(()=>{}));\n        }\n    }\n    event.waitUntil(Promise.all(tasks));\n});\nself.addEventListener(\"notificationclick\", (event)=>{\n    event.notification.close();\n    const targetUrl = event.notification.data && event.notification.data.url || \"/\";\n    event.waitUntil((async ()=>{\n        const allClients = await self.clients.matchAll({\n            type: \"window\",\n            includeUncontrolled: true\n        });\n        for (const client of allClients){\n            try {\n                const clientUrl = new URL(client.url);\n                if (clientUrl.origin === self.location.origin && \"focus\" in client) {\n                    if (\"navigate\" in client) {\n                        await client.navigate(targetUrl);\n                    }\n                    return client.focus();\n                }\n            } catch (e) {\n            /* ignore */ }\n        }\n        if (self.clients.openWindow) {\n            return self.clients.openWindow(targetUrl);\n        }\n    })());\n});\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi93b3JrZXIvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUEsa0JBQWtCLEdBQ2xCLGlFQUFpRTtBQUNqRSxzRUFBc0U7QUFDdEUsdUVBQXVFO0FBQ3ZFLDRDQUE0QztBQUU1Q0EsS0FBS0MsZ0JBQWdCLENBQUMsUUFBUSxDQUFDQztJQUM3QixJQUFJQyxVQUFVLENBQUM7SUFDZixJQUFJO1FBQ0ZBLFVBQVVELE1BQU1FLElBQUksR0FBR0YsTUFBTUUsSUFBSSxDQUFDQyxJQUFJLEtBQUssQ0FBQztJQUM5QyxFQUFFLE9BQU9DLEdBQUc7UUFDVkgsVUFBVTtZQUFFSSxPQUFPO1lBQVVDLE1BQU1OLE1BQU1FLElBQUksR0FBR0YsTUFBTUUsSUFBSSxDQUFDSyxJQUFJLEtBQUs7UUFBRztJQUN6RTtJQUVBLE1BQU1GLFFBQVFKLFFBQVFJLEtBQUssSUFBSTtJQUMvQixNQUFNRyxNQUFNUCxRQUFRTyxHQUFHLElBQUk7SUFDM0IsTUFBTUMsVUFBVTtRQUNkSCxNQUFNTCxRQUFRSyxJQUFJLElBQUk7UUFDdEJJLE1BQU1ULFFBQVFTLElBQUksSUFBSTtRQUN0QkMsT0FBTztRQUNQQyxLQUFLWCxRQUFRVyxHQUFHLElBQUk7UUFDcEJDLFVBQVU7UUFDVlgsTUFBTTtZQUFFTTtRQUFJO0lBQ2Q7SUFFQSxNQUFNTSxRQUFRO1FBQUNoQixLQUFLaUIsWUFBWSxDQUFDQyxnQkFBZ0IsQ0FBQ1gsT0FBT0k7S0FBUztJQUVsRSxJQUFJLE9BQU9SLFFBQVFVLEtBQUssS0FBSyxZQUFZYixLQUFLbUIsU0FBUyxJQUFJbkIsS0FBS21CLFNBQVMsQ0FBQ0MsV0FBVyxFQUFFO1FBQ3JGLElBQUlqQixRQUFRVSxLQUFLLEdBQUcsR0FBRztZQUNyQkcsTUFBTUssSUFBSSxDQUFDckIsS0FBS21CLFNBQVMsQ0FBQ0MsV0FBVyxDQUFDakIsUUFBUVUsS0FBSyxFQUFFUyxLQUFLLENBQUMsS0FBTztRQUNwRSxPQUFPLElBQUl0QixLQUFLbUIsU0FBUyxDQUFDSSxhQUFhLEVBQUU7WUFDdkNQLE1BQU1LLElBQUksQ0FBQ3JCLEtBQUttQixTQUFTLENBQUNJLGFBQWEsR0FBR0QsS0FBSyxDQUFDLEtBQU87UUFDekQ7SUFDRjtJQUVBcEIsTUFBTXNCLFNBQVMsQ0FBQ0MsUUFBUUMsR0FBRyxDQUFDVjtBQUM5QjtBQUVBaEIsS0FBS0MsZ0JBQWdCLENBQUMscUJBQXFCLENBQUNDO0lBQzFDQSxNQUFNeUIsWUFBWSxDQUFDQyxLQUFLO0lBQ3hCLE1BQU1DLFlBQVksTUFBT0YsWUFBWSxDQUFDdkIsSUFBSSxJQUFJRixNQUFNeUIsWUFBWSxDQUFDdkIsSUFBSSxDQUFDTSxHQUFHLElBQUs7SUFFOUVSLE1BQU1zQixTQUFTLENBQ2IsQ0FBQztRQUNDLE1BQU1NLGFBQWEsTUFBTTlCLEtBQUsrQixPQUFPLENBQUNDLFFBQVEsQ0FBQztZQUM3Q0MsTUFBTTtZQUNOQyxxQkFBcUI7UUFDdkI7UUFDQSxLQUFLLE1BQU1DLFVBQVVMLFdBQVk7WUFDL0IsSUFBSTtnQkFDRixNQUFNTSxZQUFZLElBQUlDLElBQUlGLE9BQU96QixHQUFHO2dCQUNwQyxJQUFJMEIsVUFBVUUsTUFBTSxLQUFLdEMsS0FBS3VDLFFBQVEsQ0FBQ0QsTUFBTSxJQUFJLFdBQVdILFFBQVE7b0JBQ2xFLElBQUksY0FBY0EsUUFBUTt3QkFDeEIsTUFBTUEsT0FBT0ssUUFBUSxDQUFDWDtvQkFDeEI7b0JBQ0EsT0FBT00sT0FBT00sS0FBSztnQkFDckI7WUFDRixFQUFFLE9BQU9uQyxHQUFHO1lBQ1YsVUFBVSxHQUNaO1FBQ0Y7UUFDQSxJQUFJTixLQUFLK0IsT0FBTyxDQUFDVyxVQUFVLEVBQUU7WUFDM0IsT0FBTzFDLEtBQUsrQixPQUFPLENBQUNXLFVBQVUsQ0FBQ2I7UUFDakM7SUFDRjtBQUVKIiwic291cmNlcyI6WyJDOlxcUHJvamV0b3NcXExpc3Rhw6pcXHdvcmtlclxcaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgKi9cclxuLy8gQ3VzdG9tIHNlcnZpY2Ugd29ya2VyIGltcG9ydGFkbyBwZWxvIG5leHQtcHdhIG5vIHN3LmpzIGdlcmFkby5cclxuLy8gUmVzcG9uc8OhdmVsIHBvciBleGliaXIgV2ViIFB1c2ggbmEgYmFycmEgZGUgbm90aWZpY2HDp8O1ZXMgZG8gc2lzdGVtYVxyXG4vLyAobWVzbW8gY29tIG8gUFdBIGZlY2hhZG8vbWluaW1pemFkbyBvdSBhIHRlbGEgYmxvcXVlYWRhKSBlIGF0dWFsaXphclxyXG4vLyBvIGNvbnRhZG9yIG5vIMOtY29uZSBkbyBhcHAgKEJhZGdpbmcgQVBJKS5cclxuXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcInB1c2hcIiwgKGV2ZW50KSA9PiB7XHJcbiAgbGV0IHBheWxvYWQgPSB7fTtcclxuICB0cnkge1xyXG4gICAgcGF5bG9hZCA9IGV2ZW50LmRhdGEgPyBldmVudC5kYXRhLmpzb24oKSA6IHt9O1xyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIHBheWxvYWQgPSB7IHRpdGxlOiBcIkxpc3Rhw6pcIiwgYm9keTogZXZlbnQuZGF0YSA/IGV2ZW50LmRhdGEudGV4dCgpIDogXCJcIiB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3QgdGl0bGUgPSBwYXlsb2FkLnRpdGxlIHx8IFwiTGlzdGHDqlwiO1xyXG4gIGNvbnN0IHVybCA9IHBheWxvYWQudXJsIHx8IFwiL1wiO1xyXG4gIGNvbnN0IG9wdGlvbnMgPSB7XHJcbiAgICBib2R5OiBwYXlsb2FkLmJvZHkgfHwgXCJcIixcclxuICAgIGljb246IHBheWxvYWQuaWNvbiB8fCBcIi9pY29uLTE5Mi5wbmdcIixcclxuICAgIGJhZGdlOiBcIi9pY29uLTE5Mi5wbmdcIixcclxuICAgIHRhZzogcGF5bG9hZC50YWcgfHwgXCJsaXN0YWVcIixcclxuICAgIHJlbm90aWZ5OiB0cnVlLFxyXG4gICAgZGF0YTogeyB1cmwgfSxcclxuICB9O1xyXG5cclxuICBjb25zdCB0YXNrcyA9IFtzZWxmLnJlZ2lzdHJhdGlvbi5zaG93Tm90aWZpY2F0aW9uKHRpdGxlLCBvcHRpb25zKV07XHJcblxyXG4gIGlmICh0eXBlb2YgcGF5bG9hZC5iYWRnZSA9PT0gXCJudW1iZXJcIiAmJiBzZWxmLm5hdmlnYXRvciAmJiBzZWxmLm5hdmlnYXRvci5zZXRBcHBCYWRnZSkge1xyXG4gICAgaWYgKHBheWxvYWQuYmFkZ2UgPiAwKSB7XHJcbiAgICAgIHRhc2tzLnB1c2goc2VsZi5uYXZpZ2F0b3Iuc2V0QXBwQmFkZ2UocGF5bG9hZC5iYWRnZSkuY2F0Y2goKCkgPT4ge30pKTtcclxuICAgIH0gZWxzZSBpZiAoc2VsZi5uYXZpZ2F0b3IuY2xlYXJBcHBCYWRnZSkge1xyXG4gICAgICB0YXNrcy5wdXNoKHNlbGYubmF2aWdhdG9yLmNsZWFyQXBwQmFkZ2UoKS5jYXRjaCgoKSA9PiB7fSkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZXZlbnQud2FpdFVudGlsKFByb21pc2UuYWxsKHRhc2tzKSk7XHJcbn0pO1xyXG5cclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKFwibm90aWZpY2F0aW9uY2xpY2tcIiwgKGV2ZW50KSA9PiB7XHJcbiAgZXZlbnQubm90aWZpY2F0aW9uLmNsb3NlKCk7XHJcbiAgY29uc3QgdGFyZ2V0VXJsID0gKGV2ZW50Lm5vdGlmaWNhdGlvbi5kYXRhICYmIGV2ZW50Lm5vdGlmaWNhdGlvbi5kYXRhLnVybCkgfHwgXCIvXCI7XHJcblxyXG4gIGV2ZW50LndhaXRVbnRpbChcclxuICAgIChhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGFsbENsaWVudHMgPSBhd2FpdCBzZWxmLmNsaWVudHMubWF0Y2hBbGwoe1xyXG4gICAgICAgIHR5cGU6IFwid2luZG93XCIsXHJcbiAgICAgICAgaW5jbHVkZVVuY29udHJvbGxlZDogdHJ1ZSxcclxuICAgICAgfSk7XHJcbiAgICAgIGZvciAoY29uc3QgY2xpZW50IG9mIGFsbENsaWVudHMpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgY2xpZW50VXJsID0gbmV3IFVSTChjbGllbnQudXJsKTtcclxuICAgICAgICAgIGlmIChjbGllbnRVcmwub3JpZ2luID09PSBzZWxmLmxvY2F0aW9uLm9yaWdpbiAmJiBcImZvY3VzXCIgaW4gY2xpZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChcIm5hdmlnYXRlXCIgaW4gY2xpZW50KSB7XHJcbiAgICAgICAgICAgICAgYXdhaXQgY2xpZW50Lm5hdmlnYXRlKHRhcmdldFVybCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGNsaWVudC5mb2N1cygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgIC8qIGlnbm9yZSAqL1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoc2VsZi5jbGllbnRzLm9wZW5XaW5kb3cpIHtcclxuICAgICAgICByZXR1cm4gc2VsZi5jbGllbnRzLm9wZW5XaW5kb3codGFyZ2V0VXJsKTtcclxuICAgICAgfVxyXG4gICAgfSkoKVxyXG4gICk7XHJcbn0pO1xyXG4iXSwibmFtZXMiOlsic2VsZiIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsInBheWxvYWQiLCJkYXRhIiwianNvbiIsImUiLCJ0aXRsZSIsImJvZHkiLCJ0ZXh0IiwidXJsIiwib3B0aW9ucyIsImljb24iLCJiYWRnZSIsInRhZyIsInJlbm90aWZ5IiwidGFza3MiLCJyZWdpc3RyYXRpb24iLCJzaG93Tm90aWZpY2F0aW9uIiwibmF2aWdhdG9yIiwic2V0QXBwQmFkZ2UiLCJwdXNoIiwiY2F0Y2giLCJjbGVhckFwcEJhZGdlIiwid2FpdFVudGlsIiwiUHJvbWlzZSIsImFsbCIsIm5vdGlmaWNhdGlvbiIsImNsb3NlIiwidGFyZ2V0VXJsIiwiYWxsQ2xpZW50cyIsImNsaWVudHMiLCJtYXRjaEFsbCIsInR5cGUiLCJpbmNsdWRlVW5jb250cm9sbGVkIiwiY2xpZW50IiwiY2xpZW50VXJsIiwiVVJMIiwib3JpZ2luIiwibG9jYXRpb24iLCJuYXZpZ2F0ZSIsImZvY3VzIiwib3BlbldpbmRvdyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./worker/index.js\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	(() => {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = () => {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: (script) => (script)
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	(() => {
/******/ 		__webpack_require__.ts = (script) => (__webpack_require__.tt().createScript(script));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	(() => {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push((options) => {
/******/ 			const originalFactory = options.factory;
/******/ 			options.factory = (moduleObject, moduleExports, webpackRequire) => {
/******/ 				if (!originalFactory) {
/******/ 					document.location.reload();
/******/ 					return;
/******/ 				}
/******/ 				const hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				const cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : () => {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./worker/index.js");
/******/ 	
/******/ })()
;