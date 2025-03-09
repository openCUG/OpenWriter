import React from 'react';
import { Progress, Card } from 'antd';

interface GenerationProgressProps {
  progress: number;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({ progress }) => {
  return (
    <Card>
      <div className="text-center">
        <h3 className="mb-4">正在生成论文...</h3>
        <Progress percent={progress} status="active" />
        <p className="mt-4 text-gray-500">
          请耐心等待，论文生成可能需要几分钟时间
        </p>
      </div>
    </Card>
  );
};

export default GenerationProgress; 