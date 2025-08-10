import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Typography, Popconfirm, ColorPicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Color } from 'antd/es/color-picker';
import { classesApi } from '../services/api';

interface ClassInfo {
  id: string;
  name: string;
  color?: string;
}

const ClassSettings: React.FC = () => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [form] = Form.useForm();

  // Load class data
  const loadClasses = async () => {
    setLoading(true);
    try {
      const response = await classesApi.getAll();
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Failed to load class data:', error);
      message.error(t('classSettings.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Initialize loading
  useEffect(() => {
    loadClasses();
  }, []);

  // Add or update class
  const handleSaveClass = async () => {
    try {
      const values = await form.validateFields();
      const isEditing = !!editingClass;
      const classData = isEditing 
        ? { ...values, id: editingClass.id } 
        : { ...values, id: Date.now().toString() };

      if (isEditing) {
        await classesApi.update(editingClass.id, classData);
      } else {
        await classesApi.create(classData);
      }

      message.success(isEditing 
        ? t('classSettings.messages.updateSuccess') 
        : t('classSettings.messages.addSuccess'));
      setModalVisible(false);
      form.resetFields();
      loadClasses();
    } catch (error) {
      console.error('Failed to save class:', error);
      message.error(t('classSettings.messages.saveFailed'));
    }
  };

  // Delete class
  const handleDeleteClass = async (id: string) => {
    try {
      await classesApi.delete(id);
      message.success(t('classSettings.messages.deleteSuccess'));
      loadClasses();
    } catch (error) {
      console.error('Failed to delete class:', error);
      message.error(t('classSettings.messages.deleteFailed'));
    }
  };

  // Open edit modal
  const handleEdit = (record: ClassInfo) => {
    setEditingClass(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  // Open add modal
  const handleAdd = () => {
    setEditingClass(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Table column definitions
  const columns = [
    {
      title: t('common.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('classSettings.color'),
      dataIndex: 'color',
      key: 'color',
      width: 120,
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div 
            style={{
              width: 20,
              height: 20,
              backgroundColor: color || '#f0f0f0',
              border: '1px solid #d9d9d9',
              borderRadius: 4
            }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>
            {color || t('classSettings.noColor')}
          </span>
        </div>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: any, record: ClassInfo) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title={t('classSettings.messages.confirmDelete')}
            onConfirm={() => handleDeleteClass(record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger 
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Typography.Title level={4}>{t('classSettings.title')}</Typography.Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          {t('classSettings.addClass')}
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={classes} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, showQuickJumper: true }}
        size="small"
        style={{ flex: 1 }}
      />

      <Modal
        title={editingClass ? t('classSettings.editClass') : t('classSettings.addClass')}
        open={modalVisible}
        onOk={handleSaveClass}
        onCancel={() => setModalVisible(false)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label={t('common.name')}
            rules={[{ required: true, message: t('classSettings.form.nameRequired') }]}
          >
            <Input placeholder={t('classSettings.form.namePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="color"
            label={t('classSettings.color')}
          >
            <ColorPicker
              showText
              format="hex"
              presets={[
                {
                  label: t('classSettings.presetColors'),
                  colors: [
                    '#FFD700', // Gold
                    '#FF6347', // Tomato
                    '#32CD32', // Lime Green
                    '#87CEEB', // Sky Blue
                    '#DDA0DD', // Plum
                    '#F0E68C', // Khaki
                    '#FF69B4', // Hot Pink
                    '#40E0D0', // Turquoise
                    '#FFA500', // Orange
                    '#9370DB', // Medium Purple
                    '#20B2AA', // Light Sea Green
                    '#F5DEB3', // Wheat
                    '#FF1493', // Deep Pink
                  ],
                },
              ]}
              onChange={(color: Color) => {
                form.setFieldValue('color', color.toHexString());
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassSettings;