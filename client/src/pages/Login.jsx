import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CompanyLogo from '../components/common/CompanyLogo';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already authenticated
    if (isAuthenticated) {
        const redirectPath = user?.role === 'admin' ? '/admin' :
            user?.role === 'staff' ? '/staff' : '/client';
        return <Navigate to={redirectPath} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            const redirectPath = result.user.role === 'admin' ? '/admin' :
                result.user.role === 'staff' ? '/staff' : '/client';
            navigate(redirectPath);
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <CompanyLogo size={140} theme="dark" />
                    <h1 style={{
                        color: '#FFD600',
                        fontSize: '1.8rem',
                        marginBottom: '4px',
                        fontFamily: "'Times New Roman', Times, serif",
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                    }}>
                        Cerebrospark Innovations
                    </h1>
                    <p style={{
                        color: '#e0e0e0',
                        fontSize: '0.9rem',
                        fontFamily: "'Times New Roman', Times, serif",
                        letterSpacing: '2px',
                        fontWeight: 'bold'
                    }}>
                        PRIVATE LIMITED
                    </p>
                </div>


                {/* Login Card */}
                <div className="card" style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '32px'
                }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.25rem' }}>
                        Login to Dashboard
                    </h2>

                    {error && (
                        <div style={{
                            background: '#FFEBEE',
                            color: '#F44336',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>


                </div>

                {/* Footer */}
                <p style={{
                    textAlign: 'center',
                    marginTop: '24px',
                    color: '#666',
                    fontSize: '0.75rem'
                }}>
                    © 2024 Cerebrospark Innovations. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Login;
