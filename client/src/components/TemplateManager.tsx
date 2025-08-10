import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Switch, 
  Button, 
  Table, 
  Space, 
  message, 
  Popconfirm, 
  Card,
  Typography,
  Tag,
  Drawer
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  StarOutlined, 
  StarFilled,
  SettingOutlined 
} from '@ant-design/icons';
import { OCRTemplate } from '../types';
import { templateApi } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

// const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface TemplateManagerProps {
  module: 'kvm' | 'gvg' | 'aa' | 'guild';
  visible: boolean;
  onClose: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ module, visible, onClose }) => {
  const { t } = useTranslation();
  
  // Translate default template names
  const translateTemplateName = (name: string): string => {
    const templateNameMap: { [key: string]: string } = {
      'Default Guild Member Template': t('templates.defaultGuildTemplate'),
      'Default KVM Template': t('templates.defaultKVMTemplate'),
      'Default GVG Template': t('templates.defaultGVGTemplate'),
      'Default AA Template': t('templates.defaultAATemplate')
    };
    return templateNameMap[name] || name;
  };
  const [templates, setTemplates] = useState<OCRTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OCRTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<OCRTemplate | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Load template list
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateApi.getTemplates(module);
      if (response.data.success) {
        setTemplates(response.data.data || []);
      } else {
        message.error(response.data.message || 'Failed to load templates');
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      message.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible, module]);

  // Open create/edit modal
  const handleEdit = (template?: OCRTemplate) => {
    if (template) {
      setEditingTemplate(template);
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        isDefault: template.isDefault
      });
    } else {
      setEditingTemplate(null);
      form.resetFields();
      form.setFieldsValue({
        isDefault: false
      });
    }
    setIsModalVisible(true);
  };

  // Save template
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Create basic template structure
      const templateData = {
        name: values.name,
        module,
        description: values.description,
        isDefault: values.isDefault,
        template: getDefaultTemplateStructure()
      };

      let response;
      if (editingTemplate) {
        response = await templateApi.update(editingTemplate.id, templateData);
      } else {
        response = await templateApi.create(templateData);
      }

      if (response.data.success) {
        message.success(editingTemplate ? 'Template updated successfully' : 'Template created successfully');
        setIsModalVisible(false);
        form.resetFields();
        loadTemplates();
      } else {
        message.error(response.data.message || 'Failed to save template');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      message.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  // Get default template structure
  const getDefaultTemplateStructure = () => {
    const baseStructure = {
      fieldMapping: {},
      parseRules: [
        {
          name: 'Skip header lines',
          type: 'line_pattern' as const,
          config: {
            skipConditions: ['Title', 'Title', '---']
          }
        }
      ],
      outputFormat: {
        type: module,
        structure: { type: 'array', items: `${module}Data` }
      }
    };

    // Set different field mappings for different modules
    switch (module) {
      case 'guild':
        baseStructure.fieldMapping = {
          name: { name: 'Name', type: 'string', required: true },
          level: { name: 'Level', type: 'number', required: true },
          class: { name: 'Class', type: 'string', required: true },
          gender: { name: 'Gender', type: 'string', required: false },
          position: { name: 'Guild ID', type: 'string', required: false }
        };
        break;
      case 'kvm':
        baseStructure.fieldMapping = {
          activity: { name: t('template.fieldNames.activity'), type: 'string', required: true, defaultValue: 'KVM' },
          date: { name: t('template.fieldNames.date'), type: 'date', required: true },
          total_participants: { name: t('template.fieldNames.totalParticipants'), type: 'number', required: true },
          non_participants: { name: t('template.fieldNames.nonParticipants'), type: 'string', required: true }
        };
        break;
      case 'gvg':
        baseStructure.fieldMapping = {
          date: { name: t('template.fieldNames.date'), type: 'date', required: true },
          event_type: { name: t('template.fieldNames.eventType'), type: 'string', required: true, defaultValue: 'GVG' },
          participants: { name: t('template.fieldNames.participants'), type: 'string', required: false },
          non_participants: { name: t('template.fieldNames.nonParticipants'), type: 'string', required: true }
        };
        break;
      case 'aa':
        baseStructure.fieldMapping = {
          activity: { name: t('template.fieldNames.activity'), type: 'string', required: true, defaultValue: 'AA' },
          date: { name: t('template.fieldNames.date'), type: 'date', required: true },
          total_participants: { name: t('template.fieldNames.totalParticipants'), type: 'number', required: true },
          participants: { name: t('template.fieldNames.participants'), type: 'string', required: true }
        };
        break;
    }

    return baseStructure;
  };

  // Set default template
  const handleSetDefault = async (templateId: string) => {
    try {
      setLoading(true);
      const response = await templateApi.setDefault(templateId);
      if (response.data.success) {
        message.success('Default template set successfully');
        loadTemplates();
      } else {
        message.error(response.data.message || 'Failed to set default template');
      }
    } catch (error) {
      console.error('Failed to set default template:', error);
      message.error('Failed to set default template');
    } finally {
      setLoading(false);
    }
  };

  // Delete template
  const handleDelete = async (templateId: string) => {
    try {
      setLoading(true);
      const response = await templateApi.delete(templateId);
      if (response.data.success) {
        message.success('Template deleted successfully');
        loadTemplates();
      } else {
        message.error(response.data.message || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      message.error('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  // View template details
  const handleViewDetail = (template: OCRTemplate) => {
    setSelectedTemplate(template);
    setDetailVisible(true);
  };

  const columns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: OCRTemplate) => (
        <Space>
          <Text strong>{translateTemplateName(name)}</Text>
          {record.isDefault && <StarFilled style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      render: (module: string) => (
        <Tag color="blue">{module.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Default',
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (isDefault: boolean) => (
        isDefault ? <Tag color="gold">Default</Tag> : <Tag>Normal</Tag>
      ),
    },
    {
      title: 'Updated At',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: OCRTemplate) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            Details
          </Button>
          {!record.isDefault && (
            <Button
              type="text"
              icon={<StarOutlined />}
              onClick={() => handleSetDefault(record.id)}
            >
              Set as Default
            </Button>
          )}
          <Popconfirm
            title="Are you sure you want to delete this template?"
            onConfirm={() => handleDelete(record.id)}
            okText="OK"
            cancelText="Cancel"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={`${module.toUpperCase()} Template Management`}
        open={visible}
        onCancel={onClose}
        width={1000}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              Template List
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleEdit()}
            >
              Create Template
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={templates}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Space>
      </Modal>

      {/* Create/Edit template modal */}
      <Modal
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Template Name"
            name="name"
            rules={[{ required: true, message: 'Please enter template name' }]}
          >
            <Input placeholder="Please enter template name" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={3} placeholder="Please enter template description (optional)" />
          </Form.Item>

          <Form.Item
            label="Set as Default Template"
            name="isDefault"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Template details drawer */}
      <Drawer
        title="Template Details"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
      >
        {selectedTemplate && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Template Name:</Text>
                  <Text>{selectedTemplate.name}</Text>
                </div>
                <div>
                  <Text strong>Module:</Text>
                  <Tag color="blue">{selectedTemplate.module.toUpperCase()}</Tag>
                </div>
                <div>
                  <Text strong>Description:</Text>
                  <Text>{selectedTemplate.description || 'None'}</Text>
                </div>
                <div>
                  <Text strong>Is Default:</Text>
                  <Tag color={selectedTemplate.isDefault ? 'gold' : 'default'}>
                    {selectedTemplate.isDefault ? 'Default' : 'Normal'}
                  </Tag>
                </div>
                <div>
                  <Text strong>Created At:</Text>
                  <Text>{new Date(selectedTemplate.createdAt).toLocaleString()}</Text>
                </div>
                <div>
                  <Text strong>Updated At:</Text>
                  <Text>{new Date(selectedTemplate.updatedAt).toLocaleString()}</Text>
                </div>
              </Space>
            </Card>

            <Card size="small" title="Field Mapping">
              <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '12px' }}>
                {JSON.stringify(selectedTemplate.template.fieldMapping, null, 2)}
              </pre>
            </Card>

            <Card size="small" title="Parse Rules">
              <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '12px' }}>
                {JSON.stringify(selectedTemplate.template.parseRules, null, 2)}
              </pre>
            </Card>

            <Card size="small" title="Output Format">
              <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '12px' }}>
                {JSON.stringify(selectedTemplate.template.outputFormat, null, 2)}
              </pre>
            </Card>
          </Space>
        )}
      </Drawer>
    </>
  );
};

export default TemplateManager;