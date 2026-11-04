import { useState } from 'preact/hooks';
import { decodeJwt } from '../../lib/tools/jwt';
import { Alert, Field, ToolForm, valueOf } from './ui';

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [decoded, setDecoded] = useState<ReturnType<typeof decodeJwt> | null>(null);

  function decode() {
    const result = decodeJwt(token);
    if (!result.ok) {
      setError(result.error);
      setDecoded(null);
      return;
    }
    setError('');
    setDecoded(result);
  }

  return (
    <ToolForm onSubmit={decode}>
      <p className="tool-hint">Decoding reads the header and payload. It does not verify the signature.</p>
      <Field id="jwt-token" label="JSON Web Token">
        <textarea id="jwt-token" value={token} onInput={(event) => setToken(valueOf(event))} spellcheck={false} autoComplete="off" />
      </Field>
      <div className="tool-actions">
        <button className="tool-btn" type="submit">
          Decode
        </button>
      </div>
      <Alert message={error} />
      {decoded?.ok ? (
        <div className="tool-result" role="status" aria-live="polite">
          <p>Algorithm claim: {decoded.value.algorithm ?? 'not set'}.</p>
          {decoded.value.issuedAt ? <p>Issued at: {decoded.value.issuedAt}.</p> : null}
          {decoded.value.notBefore ? (
            <p>
              Not before: {decoded.value.notBefore}.{decoded.value.notYetValid ? ' Not valid yet.' : ''}
            </p>
          ) : null}
          {decoded.value.expiresAt ? (
            <p>
              Expires: {decoded.value.expiresAt}.
              {decoded.value.expired ? ' This expiry is in the past on this clock.' : ' This expiry is still ahead on this clock.'}
            </p>
          ) : null}
          <h2>Header</h2>
          <pre className="tool-output">{decoded.value.headerText}</pre>
          <h2>Payload</h2>
          <pre className="tool-output">{decoded.value.payloadText}</pre>
          <h2>Signature (not checked)</h2>
          <pre className="tool-output">{decoded.value.signature || '(empty)'}</pre>
        </div>
      ) : null}
    </ToolForm>
  );
}
