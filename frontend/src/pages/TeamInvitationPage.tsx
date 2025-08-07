import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TeamInvitationPage = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/dashboard'); }, [navigate]);
  return null;
};

export default TeamInvitationPage; 