import { useEffect } from 'react';

interface TeamSetupStepProps {
  onNext: () => void;
}

const TeamSetupStep: React.FC<TeamSetupStepProps> = ({ onNext }) => {
  useEffect(() => { onNext(); }, [onNext]);
  return null;
};

export default TeamSetupStep; 