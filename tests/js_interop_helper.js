/**
 * Node helper for tests/test_js_interop.py.
 * Reads a JSON job from stdin, runs the REAL browser crypto (static/js/crypto_client.js) under Node's
 * WebCrypto, and prints a JSON result. Proves Python and JavaScript agree on every wire format.
 */
const path = require('path');
const { SecureCryptoClient, CNSCrypto } = require(path.join(__dirname, '..', 'static', 'js', 'crypto_client.js'));

async function main(job) {
    const out = {};
    if (job.op === 'session') {
        // Build a client from a shared secret and (optionally) decrypt packets / encrypt new ones
        const c = new SecureCryptoClient(job.username);
        c.sessionId = job.session_id;
        c.peer = job.peer;
        c.isSessionEstablished = true;
        await c.initRatchet(CNSCrypto.hexToBytes(job.shared_secret_hex), job.pub_a, job.pub_b, job.is_initiator);
        out.send_ck_fp = c.sendCKFp;
        out.recv_ck_fp = c.recvCKFp;

        out.decrypted = [];
        for (const pkt of job.incoming || []) {
            try { out.decrypted.push({ ok: true, plaintext: await c.verifyAndDecrypt(pkt) }); }
            catch (e) { out.decrypted.push({ ok: false, kind: e.kind, message: e.message }); }
        }
        out.encrypted = [];
        for (const item of job.to_send || []) {
            c.cipherMode = item.mode;
            out.encrypted.push(await c.encryptMessage(item.text));
        }
    } else if (job.op === 'file_decrypt') {
        // Decrypt a blob produced by Python with the browser's file code
        const aad = CNSCrypto.fileAad(job.file_id, job.sender, job.receiver);
        try {
            const plain = await CNSCrypto.decryptFile(CNSCrypto.hexToBytes(job.blob_hex), CNSCrypto.hexToBytes(job.key_hex), aad);
            out.plain_hex = CNSCrypto.bytesToHex(plain);
            out.sha256 = await CNSCrypto.sha256Hex(plain);
        } catch (e) { out.error_kind = e.kind; }
    } else if (job.op === 'file_encrypt') {
        const data = CNSCrypto.hexToBytes(job.data_hex);
        const { blob, key } = await CNSCrypto.encryptFile(data, CNSCrypto.fileAad(job.file_id, job.sender, job.receiver));
        out.blob_hex = CNSCrypto.bytesToHex(blob);
        out.key_hex = CNSCrypto.bytesToHex(key);
        out.sha256 = await CNSCrypto.sha256Hex(data);
    } else if (job.op === 'dh') {
        // Signature + DH interop: verify Python's signature; sign for Python; subgroup checks
        out.py_sig_ok = await CNSCrypto.verifyText(job.public_pem, job.text, job.signature);
        const id = await CNSCrypto.generateIdentity();
        out.js_pub = id.pub;
        out.js_sig = await CNSCrypto.signText(id.priv, job.text);
        out.subgroup_ok = CNSCrypto.isValidPublic(BigInt('0x' + job.valid_pub));
        out.subgroup_accepts_p_minus_1 = CNSCrypto.isValidPublic(CNSCrypto.P - 1n);
        out.subgroup_accepts_nonresidue = CNSCrypto.isValidPublic(11n);
        const kp = CNSCrypto.generateDH();
        out.js_dh_pub = CNSCrypto.bigToHex(kp.pub);
        out.js_dh_priv = CNSCrypto.bigToHex(kp.priv);
    }
    return out;
}

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', async () => {
    try { console.log(JSON.stringify(await main(JSON.parse(input)))); }
    catch (e) { console.error(e.stack); process.exit(1); }
});
