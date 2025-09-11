// Authentication Modal component
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    } else {
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>Sign In</h2>
          <button className="auth-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="auth-modal-content">
          {error && <div className="auth-error">{error}</div>}
          
          <button 
            className="auth-google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <i className="fab fa-google"></i>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
