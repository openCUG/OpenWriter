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

  // 确定大纲项的层级
  const getItemLevel = (item: string): number => {
    // 检查是否有数字编号格式（如1., 1.1, 1.1.1等）
    const numberMatch = item.match(/^(\d+\.)+\d*\s/);
    if (numberMatch) {
      // 计算点号的数量来确定层级
      const dots = (numberMatch[0].match(/\./g) || []).length;
      return dots + 1;
    }
    
    // 检查缩进空格来确定层级
    const indentMatch = item.match(/^(\s+)/);
    if (indentMatch) {
      // 每两个空格算一级缩进
      return Math.ceil(indentMatch[0].length / 2);
    }
    
    // 检查罗马数字或字母编号
    if (/^[IVXivx]+\.\s/.test(item)) return 2;
    if (/^[a-zA-Z]\)\s/.test(item)) return 3;
    if (/^[a-zA-Z]\.\s/.test(item)) return 2;
    
    // 默认为第一级
    return 1;
  };

  // 提取项目编号
  const getItemNumber = (item: string): string => {
    const match = item.match(/^(\d+\.)+\d*\s|^[IVXivx]+\.\s|^[a-zA-Z]\)\s|^[a-zA-Z]\.\s/);
    return match ? match[0] : '';
  };

  // 提取项目内容（不包含编号）
  const getItemContent = (item: string): string => {
    return item.replace(/^(\d+\.)+\d*\s|^[IVXivx]+\.\s|^[a-zA-Z]\)\s|^[a-zA-Z]\.\s|\s+/, '').trim();
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
          renderItem={(item, index) => {
            const level = getItemLevel(item);
            const itemNumber = getItemNumber(item);
            const itemContent = getItemContent(item);
            
            return (
              <List.Item
                className={editingIndex === index ? 'outline-item-editing' : ''}
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
                  <div className={`outline-item outline-item-level-${level}`}>
                    {itemNumber && <span className="outline-item-number">{itemNumber}</span>}
                    {itemContent}
                  </div>
                )}
              </List.Item>
            );
          }}
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