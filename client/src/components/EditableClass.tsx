import React, { useState, useRef, useEffect } from 'react';
import { Select, message, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { GuildMember } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { classesApi } from '../services/api';
import { getClassColor } from '../utils/classColors';

// Editable class component
interface EditableClassProps {
  className: string;
  record: GuildMember;
  onUpdate: (id: number, member: GuildMember) => Promise<void>;
}

interface ClassInfo {
  id: string;
  name: string;
}

const EditableClass: React.FC<EditableClassProps> = ({ className, record, onUpdate }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(className);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const selectRef = useRef<any>(null);

  // Load class data when component mounts
  useEffect(() => {
    loadClasses();
  }, []);

  // Load class data
  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await classesApi.getAll();
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Failed to load class data:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(className);
    loadClasses();
    setTimeout(() => {
      selectRef.current?.focus();
    }, 100);
  };

  const handleSave = async (value: string) => {
    if (value !== className) {
      try {
        const memberId = record.id;
        if (!memberId) {
          throw new Error(t('guildMember.messages.invalidMemberId'));
        }
        await onUpdate(memberId, { ...record, class: value });
        setIsEditing(false);
        message.success(t('guildMember.messages.classUpdateSuccess'));
      } catch (error) {
        console.error('Failed to update class:', error);
        setEditValue(className); // Restore original value
        message.error(t('guildMember.messages.classUpdateFailed'));
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(className);
  };

  if (isEditing) {
    return (
      <Select
        ref={selectRef}
        value={editValue}
        onChange={(value) => {
          setEditValue(value);
          handleSave(value);
        }}
        onBlur={handleCancel}
        placeholder={t('guildMember.form.placeholders.class')}
        allowClear
        loading={loadingClasses}
        showSearch
        filterOption={(input, option) =>
          (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
        }
        style={{ width: '120px' }}
        size="small"
      >
        {classes.map(classInfo => (
          <Select.Option key={classInfo.id} value={classInfo.name}>
            {classInfo.name}
          </Select.Option>
        ))}
      </Select>
    );
  }

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 4, 
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '4px',
        transition: 'background-color 0.2s'
      }}
      onClick={handleEdit}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {className ? (
        <Tag
          style={{
            backgroundColor: getClassColor(className, classes),
            color: '#000',
            border: 'none',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            margin: 0
          }}
        >
          <img 
            src={`/images/classes/${className}.webp`}
            alt={className}
            style={{
              width: '16px',
              height: '16px',
              objectFit: 'contain'
            }}
            onError={(e) => {
              // Hide image element if icon fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {className}
        </Tag>
      ) : (
        <span style={{ color: '#999' }}>-</span>
      )}
      <EditOutlined style={{ fontSize: '12px', color: '#999', opacity: 0.6 }} />
    </div>
  );
};

export default EditableClass;