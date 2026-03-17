import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useContext, useEffect } from 'react';
import axios from '../utils/axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle, FaApple, FaFacebookSquare, FaTwitter } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import Meta from '../components/common/Meta';
import '../styles/Auth.css';

const Register = () => {
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({ 
        username: '', 
        first_name: '', 
        last_name: '', 
        email: '', 
        password: '' 
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [socialSettings, setSocialSettings] = useState(null);
    const navigate = useNavigate();
    const { username, first_name, last_name, email, password } = formData;

    useEffect(() => {
        const fetchSocialSettings = async () => {
            try {
                const response = await axios.get('/api/settings/social_login_settings');
                if (response.data) {
                    setSocialSettings(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch social settings", err);
            }
        };
        fetchSocialSettings();
    }, []);

    const onChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/users', { 
                username, 
                email, 
                password,
                first_name,
                last_name
            });
            if (response.data) {
                login(response.data);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="auth-page">
            <Meta title="Register" description="Join our marketplace community and start buying or selling fashion today." />
            <div className="auth-card">
                <h2 className="text-center">Create Account</h2>
                <p className="subtitle text-center">Join our marketplace community today</p>

                {(socialSettings?.google_enabled || socialSettings?.facebook_enabled || socialSettings?.twitter_enabled || socialSettings?.apple_enabled) && (
                    <>
                        <div className="social-buttons">
                            {socialSettings?.google_enabled && (
                                <button type="button" className="social-btn" onClick={() => window.location.href = `${axios.defaults.baseURL}/api/auth/google`}><FaGoogle /> Google</button>
                            )}
                            {socialSettings?.facebook_enabled && (
                                <button type="button" className="social-btn" onClick={() => window.location.href = `${axios.defaults.baseURL}/api/auth/facebook`}><FaFacebookSquare style={{ color: '#1877F2' }} /> Facebook</button>
                            )}
                            {socialSettings?.twitter_enabled && (
                                <button type="button" className="social-btn" onClick={() => window.location.href = `${axios.defaults.baseURL}/api/auth/twitter`}><FaTwitter style={{ color: '#1DA1F2' }} /> Twitter</button>
                            )}
                            {socialSettings?.apple_enabled && (
                                <button type="button" className="social-btn" onClick={() => window.location.href = `${axios.defaults.baseURL}/api/auth/apple`}><FaApple className="text-dark" /> Apple</button>
                            )}
                        </div>
                        <div className="divider"><span>Or sign up with email</span></div>
                    </>
                )}

                <form onSubmit={onSubmit}>
                    {error && <div className="auth-error">{error}</div>}

                    {/* Username */}
                    <div className="auth-field">
                        <label className="auth-label">Display Name</label>
                        <div className="auth-input-wrapper">
                            <span className="auth-icon"><FaUser /></span>
                            <input
                                type="text"
                                className="auth-input"
                                name="username"
                                value={username}
                                placeholder="style_lover"
                                onChange={onChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            {/* First Name */}
                            <div className="auth-field">
                                <label className="auth-label">First Name</label>
                                <div className="auth-input-wrapper">
                                    <span className="auth-icon"><FaUser /></span>
                                    <input
                                        type="text"
                                        className="auth-input"
                                        name="first_name"
                                        value={first_name}
                                        placeholder="John"
                                        onChange={onChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            {/* Last Name */}
                            <div className="auth-field">
                                <label className="auth-label">Last Name</label>
                                <div className="auth-input-wrapper">
                                    <span className="auth-icon"><FaUser /></span>
                                    <input
                                        type="text"
                                        className="auth-input"
                                        name="last_name"
                                        value={last_name}
                                        placeholder="Doe"
                                        onChange={onChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="auth-field">
                        <label className="auth-label">Email Address</label>
                        <div className="auth-input-wrapper">
                            <span className="auth-icon"><FaEnvelope /></span>
                            <input
                                type="email"
                                className="auth-input"
                                name="email"
                                value={email}
                                placeholder="user@email.com"
                                onChange={onChange}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="auth-field">
                        <label className="auth-label">Password</label>
                        <div className="auth-input-wrapper">
                            <span className="auth-icon"><FaLock /></span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="auth-input"
                                name="password"
                                value={password}
                                placeholder="Min. 6 characters"
                                onChange={onChange}
                                required
                            />
                            <span
                                className="auth-icon auth-icon-right"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                        </div>
                    </div>

                    {/* Terms */}
                    <div className="auth-terms">
                        By creating an account, you agree to our{' '}
                        <Link to="/terms">Terms of Service</Link> and{' '}
                        <Link to="/privacy">Privacy Policy</Link>.
                    </div>

                    <button type="submit" className="btn-submit">Create Account</button>
                </form>

                <div className="auth-footer">
                    <span>Already have an account? </span>
                    <Link to="/login">Log in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
