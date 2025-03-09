import React from 'react';
import { Button, Typography, Card, List, Input, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ThunderboltOutlined, CheckOutlined, FormOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface OutlineEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
  onSubmit: () => void;
  loading: boolean;
  onCustomPrompt: () => void;
}

const OutlineEditor: React.FC<OutlineEditorProps> = ({ value, onChange, onSubmit, loading, onCustomPrompt }) => {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [newItem, setNewItem] = React.useState('');

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(value[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const newValue = [...value];
      newValue[editingIndex] = editingValue;
      onChange(newValue);
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleDelete = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handleAdd = () => {
    if (newItem.trim()) {
      onChange([...value, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <Title level={4}>编辑论文大纲</Title>
      <Paragraph>
        我们基于您的主题和标题生成了以下大纲。您可以编辑、添加或删除条目，然后继续生成论文。
      </Paragraph>
      
      <Card
        title={<span><ThunderboltOutlined /> 生成的大纲</span>}
        extra={<Tag color="green"><CheckOutlined /> AI 生成</Tag>}
        bordered={false}
        style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}
      >
        <Button 
          type="dashed" 
          icon={<FormOutlined />} 
          onClick={onCustomPrompt}
          style={{ marginBottom: 16 }}
        >
          使用自定义提示词重新生成
        </Button>
        
        <List
          size="small"
          bordered
          dataSource={value}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  onClick={() => handleEdit(index)}
                />,
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => handleDelete(index)}
                />
              ]}
            >
              {editingIndex === index ? (
                <Space>
                  <TextArea
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    autoSize
                    style={{ width: '100%' }}
                  />
                  <Button size="small" type="primary" onClick={handleSaveEdit}>保存</Button>
                  <Button size="small" onClick={handleCancelEdit}>取消</Button>
                </Space>
              ) : (
                <div style={{ 
                  paddingLeft: item.startsWith('  ') ? 40 : item.startsWith(' ') ? 20 : 0,
                  whiteSpace: 'pre-wrap'
                }}>
                  {item}
                </div>
              )}
            </List.Item>
          )}
          footer={
            <div style={{ display: 'flex' }}>
              <TextArea
                placeholder="添加新条目..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={handleKeyPress}
                autoSize
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAdd}
                disabled={!newItem.trim()}
              >
                添加
              </Button>
            </div>
          }
        />
      </Card>
      
      <Button
        type="primary"
        onClick={onSubmit}
        loading={loading}
        disabled={value.length === 0}
        size="large"
        block
      >
        确认大纲并生成论文
      </Button>
    </div>
  );
};

export default OutlineEditor; 