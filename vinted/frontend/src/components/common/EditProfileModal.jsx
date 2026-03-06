import React, { useState } from 'react';
import axios from '../../utils/axios';
import { FaTimes, FaUser, FaLock, FaPen, FaCamera } from 'react-icons/fa';
import '../../styles/EditProfileModal.css';
import { getImageUrl } from '../../utils/constants';
import { useTranslation } from 'react-i18next';

const EditProfileModal = ({ user, onClose, onUpdate, inline }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        username: user.username || '',
        bio: user.bio || '',
        password: '',
        confirmPassword: ''
    });
    const [profileImage, setProfileImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(getImageUrl(user.profile_image));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Sync state with props when user changes (especially for inline mode)
    React.useEffect(() => {
        setFormData({
            username: user.username || '',
            bio: user.bio || '',
            password: '',
            confirmPassword: ''
        });
        setPreviewUrl(getImageUrl(user.profile_image));
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const payload = new FormData();
            payload.append('username', formData.username);
            payload.append('bio', formData.bio);
            if (formData.password) {
                payload.append('password', formData.password);
            }
            if (profileImage) {
                payload.append('profile_image', profileImage);
            }

            console.log('Sending Profile Update request...');
            const { data } = await axios.put('/api/users/profile', payload, config);
            console.log('Profile update response:', data);
            onUpdate(data);
            if (!inline) onClose(); // Only close if modal
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <React.Fragment>
            <div className={inline ? "inline-header" : "modal-header"}>
                <h3>{inline ? '' : t('profile.edit_profile', 'Edit Profile')}</h3>
                {!inline && <button onClick={onClose} className="close-btn"><FaTimes /></button>}
            </div>

            <form onSubmit={handleSubmit} className="edit-profile-form">
                {error && <div className="error-message">{error}</div>}

                <div className="form-group" style={{ alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Profile Preview"
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                                onError={(e) => {
                                    console.error("Preview failed to load at:", e.target.src);
                                    setPreviewUrl(null); // Fallback to initial display
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                backgroundColor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b',
                                fontSize: '2rem',
                                fontWeight: 'bold'
                            }}>
                                {(formData.username || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <label htmlFor="profile-image-upload" style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            background: '#0ea5e9',
                            color: 'white',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '2px solid white'
                        }}>
                            <FaCamera size={14} />
                        </label>
                        <input
                            id="profile-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('profile.username', 'Username')}</label>
                    <div className="input-with-icon">
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder={t('profile.enter_username', 'Enter username')}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('profile.bio', 'Bio')}</label>
                    <div className="input-with-icon textarea-wrapper">
                        <FaPen className="input-icon" style={{ marginTop: '12px' }} />
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder={t('profile.tell_us_about', 'Tell us about yourself...')}
                            rows="3"
                        />
                    </div>
                </div>

                <div className="form-section-title">{t('profile.change_password_opt', 'Change Password (Optional)')}</div>

                <div className="form-group">
                    <label>{t('profile.new_password', 'New Password')}</label>
                    <div className="input-with-icon">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={t('profile.leave_blank_keep', 'Leave blank to keep current')}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('profile.confirm_password', 'Confirm Password')}</label>
                    <div className="input-with-icon">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder={t('profile.confirm_new_password', 'Confirm new password')}
                        />
                    </div>
                </div>

                <div className="modal-actions" style={inline ? { justifyContent: 'flex-start', marginTop: '20px' } : {}}>
                    {!inline && <button type="button" onClick={onClose} className="btn-cancel">{t('common.cancel', 'Cancel')}</button>}
                    <button type="submit" className="btn-save" disabled={loading} style={inline ? { width: 'auto', padding: '10px 30px' } : {}}>
                        {loading ? t('common.saving', 'Saving...') : t('common.save_changes', 'Save Changes')}
                    </button>
                </div>
            </form>
        </React.Fragment>
    );

    if (inline) {
        return <div className="edit-profile-inline">{content}</div>;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {content}
            </div>
        </div>
    );
};

export default EditProfileModal;
