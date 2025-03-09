import React, { useEffect, useState } from 'react';
import { Progress, Card, Typography, List, Spin, Statistic, Row, Col, Divider, Tag, Collapse } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, LoadingOutlined, FileTextOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface CompletedSection {
  title: string;
  content: string;
}

interface PaperGenerationStatus {
  is_generating: boolean;
  progress: number;
  total_sections: number;
  completed_sections: number;
  current_section: string;
  completed_content: CompletedSection[];
  elapsed_time: number;
  estimated_time_remaining: number | null;
}

interface PaperGenerationProgressProps {
  isGenerating: boolean;
}

const PaperGenerationProgress: React.FC<PaperGenerationProgressProps> = ({ isGenerating }) => {
  const [status, setStatus] = useState<PaperGenerationStatus>({
    is_generating: false,
    progress: 0,
    total_sections: 0,
    completed_sections: 0,
    current_section: '',
    completed_content: [],
    elapsed_time: 0,
    estimated_time_remaining: null
  });
  
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 格式化时间（秒）为可读格式
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '计算中...';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes === 0) {
      return `${remainingSeconds}秒`;
    }
    
    return `${minutes}分${remainingSeconds}秒`;
  };
  
  // 轮询获取生成状态
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        console.log('Fetching paper generation status...');
        const response = await fetch('http://localhost:8000/api/paper-generation-status');
        const data = await response.json();
        console.log('Received status:', data);
        setStatus(data);
        
        // 如果生成完成，停止轮询
        if (!data.is_generating && pollingInterval) {
          console.log('Generation completed, stopping polling');
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      } catch (error) {
        console.error('获取生成状态失败:', error);
      }
    };
    
    // 如果正在生成，开始轮询
    if (isGenerating && !pollingInterval) {
      console.log('Starting polling for paper generation status');
      fetchStatus(); // 立即获取一次
      const interval = setInterval(fetchStatus, 2000); // 每2秒获取一次
      setPollingInterval(interval);
    } else if (!isGenerating && pollingInterval) {
      console.log('Not generating anymore, clearing interval');
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // 清理函数
    return () => {
      if (pollingInterval) {
        console.log('Cleaning up interval');
        clearInterval(pollingInterval);
      }
    };
  }, [isGenerating, pollingInterval]);
  
  // 即使没有生成过程，也显示组件（用于调试）
  console.log('Rendering PaperGenerationProgress', { isGenerating, progress: status.progress });
  
  return (
    <div>
      <Card 
        title={
          <span>
            <LoadingOutlined spin={status.is_generating} /> 
            论文生成进度
            {status.is_generating ? 
              <Tag color="processing" style={{ marginLeft: 8 }}>正在生成</Tag> : 
              status.progress > 0 ?
              <Tag color="success" style={{ marginLeft: 8 }}>生成完成</Tag> :
              <Tag color="default" style={{ marginLeft: 8 }}>等待开始</Tag>
            }
          </span>
        }
        bordered={false}
        style={{ marginBottom: 16 }}
      >
        <Progress 
          percent={Math.round(status.progress)} 
          status={status.is_generating ? "active" : "success"} 
          strokeWidth={12}
        />
        
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Statistic 
              title="已完成章节" 
              value={`${status.completed_sections}/${status.total_sections}`} 
              prefix={<CheckCircleOutlined />} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="已用时间" 
              value={formatTime(status.elapsed_time)} 
              prefix={<ClockCircleOutlined />} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="预计剩余时间" 
              value={formatTime(status.estimated_time_remaining)} 
              prefix={<ClockCircleOutlined />} 
            />
          </Col>
        </Row>
        
        {status.is_generating && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">当前正在生成: </Text>
            <Text strong>{status.current_section}</Text>
          </div>
        )}
      </Card>
      
      {status.completed_content.length > 0 && (
        <Card 
          title={<span><FileTextOutlined /> 已生成内容预览</span>}
          bordered={false}
        >
          <Collapse defaultActiveKey={[]} style={{ maxHeight: '400px', overflow: 'auto' }}>
            {status.completed_content.map((section, index) => (
              <Panel 
                header={
                  <span>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    {section.title}
                  </span>
                } 
                key={index}
              >
                <div className="markdown-preview">
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    components={{
                      h1: ({node, ...props}) => <h1 style={{borderBottom: '1px solid #eaecef', paddingBottom: '0.3em'}} {...props} />,
                      h2: ({node, ...props}) => <h2 style={{borderBottom: '1px solid #eaecef', paddingBottom: '0.3em'}} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{marginTop: '1.5em'}} {...props} />,
                      p: ({node, ...props}) => <p style={{lineHeight: '1.6', marginBottom: '1em'}} {...props} />,
                      ul: ({node, ...props}) => <ul style={{paddingLeft: '2em'}} {...props} />,
                      ol: ({node, ...props}) => <ol style={{paddingLeft: '2em'}} {...props} />,
                      li: ({node, ...props}) => <li style={{marginBottom: '0.5em'}} {...props} />,
                      blockquote: ({node, ...props}) => <blockquote style={{borderLeft: '4px solid #dfe2e5', paddingLeft: '1em', color: '#6a737d'}} {...props} />,
                      code: ({node, inline, className, ...props}: any) => 
                        inline 
                          ? <code style={{background: '#f6f8fa', padding: '0.2em 0.4em', borderRadius: '3px'}} {...props} />
                          : <code style={{display: 'block', background: '#f6f8fa', padding: '1em', borderRadius: '5px', overflowX: 'auto'}} {...props} />
                    }}
                  >
                    {section.content}
                  </ReactMarkdown>
                </div>
              </Panel>
            ))}
          </Collapse>
        </Card>
      )}
    </div>
  );
};

export default PaperGenerationProgress; 