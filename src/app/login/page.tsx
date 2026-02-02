'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (data.success) {
                router.push('/');
                router.refresh();
            } else {
                setError('Invalid password');
            }
        } catch {
            setError('Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F5F5F5',
        }}>
            <div style={{
                background: '#fff',
                padding: '40px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                width: '100%',
                maxWidth: '400px',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <img
                        src="https://cdn11.bigcommerce.com/s-v8oj4rfmzr/images/stencil/250x100/gtse_logo_1612977822__44777.original.png"
                        alt="GTSE"
                        style={{ height: '50px', marginBottom: '20px' }}
                    />
                    <h1 style={{
                        color: '#4A4A4A',
                        fontSize: '20px',
                        margin: 0,
                        fontWeight: 600,
                    }}>
                        Unshipped Orders Monitor
                    </h1>
                    <p style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>
                        Enter password to continue
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            fontSize: '16px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            marginBottom: '16px',
                            boxSizing: 'border-box',
                        }}
                        autoFocus
                    />

                    {error && (
                        <div style={{
                            background: '#ffebee',
                            color: '#c62828',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            marginBottom: '16px',
                            fontSize: '14px',
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !password}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#fff',
                            backgroundColor: '#E8A33C',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
