// Use the current page origin in production so the browser never calls its own localhost.
var API_BASE = window.location.protocol === 'file:'
    ? 'http://localhost:3000/api'
    : window.location.origin + '/api';

function apiRequest(path, options) {
    options = options || {};
    var request = Object.assign({}, options);
    request.headers = Object.assign({ 'Accept': 'application/json' }, options.headers || {});

    return fetch(API_BASE + path, request).then(function(res) {
        return res.text().then(function(raw) {
            var data = {};
            if (raw) {
                try {
                    data = JSON.parse(raw);
                } catch (err) {
                    var parseError = new Error('服务返回了无效响应（HTTP ' + res.status + '）');
                    parseError.status = res.status;
                    throw parseError;
                }
            }
            if (!res.ok) {
                var requestError = new Error(data.message || ('请求失败（HTTP ' + res.status + '）'));
                requestError.status = res.status;
                requestError.data = data;
                throw requestError;
            }
            return data;
        });
    });
}

function apiErrorMessage(error) {
    if (error && error.status === 401) return '登录状态已失效，请重新登录';
    if (error && error.message) return error.message;
    return '请求失败，请稍后重试';
}
