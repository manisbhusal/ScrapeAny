const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.VERCEL = '1';
const app = require('../server');

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const request = http.request({ hostname: '127.0.0.1', port: options.port, path, method: options.method || 'GET', headers: options.headers }, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => {
                let parsed = body;
                try { parsed = JSON.parse(body); } catch { }
                resolve({ status: response.statusCode, body: parsed });
            });
        });
        request.on('error', reject);
        request.end(options.body);
    });
}

test('health endpoint reports a usable API', async () => {
    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    const port = server.address().port;
    const response = await request('/api/health', { port });
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    server.close();
});

test('scrape rejects missing URLs before launching a browser', async () => {
    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    const port = server.address().port;
    const response = await request('/api/scrape', {
        port,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'URL is required');
    server.close();
});

test('export endpoint returns markdown rows', async () => {
    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    const port = server.address().port;
    const response = await request('/api/export', {
        port,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'markdown', rows: [{ title: 'Example' }] })
    });
    assert.equal(response.status, 200);
    server.close();
});
