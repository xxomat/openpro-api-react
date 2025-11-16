import React from 'react';
import { createOpenProClient } from '@client/OpenProClient';

export function App() {
  const [baseUrl, setBaseUrl] = React.useState<string>('');
  const [apiKey, setApiKey] = React.useState<string>('');
  const [idFournisseur, setIdFournisseur] = React.useState<string>('');
  const [idDossier, setIdDossier] = React.useState<string>('');
  const [idHebergement, setIdHebergement] = React.useState<string>('');
  const [output, setOutput] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleListAccommodations = async () => {
    setLoading(true);
    setOutput('');
    try {
      const client = createOpenProClient('customer', {
        baseUrl,
        apiKey
      });
      const res = await client.listAccommodations(Number(idFournisseur));
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleListBookings = async () => {
    setLoading(true);
    setOutput('');
    try {
      const client = createOpenProClient('customer', {
        baseUrl,
        apiKey
      });
      const res = await client.listBookings(Number(idFournisseur));
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGetBooking = async () => {
    setLoading(true);
    setOutput('');
    try {
      const client = createOpenProClient('customer', {
        baseUrl,
        apiKey
      });
      const res = await client.getBooking(Number(idFournisseur), Number(idDossier));
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(String(e));
    } finally {
      setLoading(false);
    }
  };

  // listRateTypes is admin-only and not exposed in the customer playground

  const handleGetRates = async () => {
    setLoading(true);
    setOutput('');
    try {
      const client = createOpenProClient('customer', {
        baseUrl,
        apiKey
      });
      const res = await client.getRates(Number(idFournisseur), Number(idHebergement));
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGetStock = async () => {
    setLoading(true);
    setOutput('');
    try {
      const client = createOpenProClient('customer', {
        baseUrl,
        apiKey
      });
      const res = await client.getStock(Number(idFournisseur), Number(idHebergement));
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>OpenPro Playground (Customer)</h1>
      <p style={{ color: '#555' }}>
        Use sandbox credentials. Do not expose production keys in the browser.
      </p>

      <div style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
        <label>
          Base URL
          <input
            style={{ width: '100%' }}
            placeholder="https://sandbox.example/api"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
          />
        </label>
        <label>
          API Key
          <input
            style={{ width: '100%' }}
            placeholder="OsApiKey ... (without prefix)"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
        </label>
        <label>
          idFournisseur
          <input
            style={{ width: '100%' }}
            placeholder="47186"
            value={idFournisseur}
            onChange={e => setIdFournisseur(e.target.value)}
          />
        </label>
        <label>
          idDossier
          <input
            style={{ width: '100%' }}
            placeholder="123"
            value={idDossier}
            onChange={e => setIdDossier(e.target.value)}
          />
        </label>
        <label>
          idHebergement
          <input
            style={{ width: '100%' }}
            placeholder="1"
            value={idHebergement}
            onChange={e => setIdHebergement(e.target.value)}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleListAccommodations} disabled={loading || !baseUrl || !apiKey || !idFournisseur}>
          {loading ? 'Loading...' : 'List accommodations'}
        </button>
        <button style={{ marginLeft: 8 }} onClick={handleListBookings} disabled={loading || !baseUrl || !apiKey || !idFournisseur}>
          {loading ? 'Loading...' : 'List bookings'}
        </button>
        <button style={{ marginLeft: 8 }} onClick={handleGetBooking} disabled={loading || !baseUrl || !apiKey || !idFournisseur || !idDossier}>
          {loading ? 'Loading...' : 'Get booking'}
        </button>
        {/* Admin-only: listRateTypes not available in customer playground */}
        <button style={{ marginLeft: 8 }} onClick={handleGetRates} disabled={loading || !baseUrl || !apiKey || !idFournisseur || !idHebergement}>
          {loading ? 'Loading...' : 'Get rates'}
        </button>
        <button style={{ marginLeft: 8 }} onClick={handleGetStock} disabled={loading || !baseUrl || !apiKey || !idFournisseur || !idHebergement}>
          {loading ? 'Loading...' : 'Get stock'}
        </button>
      </div>

      <pre style={{ marginTop: 16, background: '#f7f7f7', padding: 12, overflow: 'auto' }}>
        {output || 'No output yet.'}
      </pre>
    </div>
  );
}


