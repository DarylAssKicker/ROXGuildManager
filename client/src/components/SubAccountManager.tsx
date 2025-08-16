import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Form, 
  Input, 
  Select, 
  Modal, 
  message, 
  Card, 
  Typography, 
  Space, 
  Tag, 
  Popconfirm,
  Alert,
  Spin
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { subAccountApi } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

interface SubAccount {
  id: string;
  username: string;
  role: 'editor' | 'viewer';
  permissions?: Array<{
    resource: string;
    actions: string[];
  }>;
  createdAt: string;
  lastLoginAt?: string;
}

interface Permission {
  resource: string;
  actions: string[];
}

const { Title } = Typography;
const { Option } = Select;

const SubAccountManager: React.FC = () => {
  const { t } = useTranslation();
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SubAccount | null>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [form] = Form.useForm();

  useEffect(() => {
    loadSubAccounts();
    loadUserPermissions();
  }, []);

  const loadSubAccounts = async () => {
    try {
      const response = await subAccountApi.getAll();
      if (response.data.success) {
        setSubAccounts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load sub-accounts:', error);
      message.error(t('subAccount.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async () => {
    try {
      const response = await subAccountApi.getMyPermissions();
      if (response.data.success) {
        setUserPermissions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingAccount) {
        // Update existing account
        const updateData = {
          ...(values.password && { password: values.password }),
          role: values.role,
          permissions: values.permissions || []
        };

        const response = await subAccountApi.update(editingAccount.id, updateData);
        if (response.data.success) {
          setSubAccounts(subAccounts.map(acc => 
            acc.id === editingAccount.id ? { ...acc, ...response.data.data } : acc
          ));
          message.success(t('subAccount.messages.updateSuccess'));
        }
      } else {
        // Create new account
        const response = await subAccountApi.create(values);
        if (response.data.success) {
          setSubAccounts([...subAccounts, response.data.data]);
          message.success(t('subAccount.messages.createSuccess'));
        }
      }
      
      setShowCreateForm(false);
      setEditingAccount(null);
      form.resetFields();
    } catch (error: any) {
      message.error(editingAccount ? t('subAccount.messages.updateFailed') : t('subAccount.messages.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubAccount = async (id: string) => {
    try {
      await subAccountApi.delete(id);
      setSubAccounts(subAccounts.filter(acc => acc.id !== id));
      message.success(t('subAccount.messages.deleteSuccess'));
    } catch (error: any) {
      message.error(t('subAccount.messages.deleteFailed'));
    }
  };

  const startEdit = (account: SubAccount) => {
    setEditingAccount(account);
    form.setFieldsValue({
      username: account.username,
      password: '',
      role: account.role,
      permissions: account.permissions || []
    });
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    setEditingAccount(null);
    setShowCreateForm(false);
    form.resetFields();
  };

  const roleLabels = {
    editor: t('subAccount.roles.editor'),
    viewer: t('subAccount.roles.viewer')
  };

  // Table columns configuration
  const columns = [
    {
      title: t('subAccount.username'),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('subAccount.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'editor' ? 'blue' : 'green'}>
          {roleLabels[role as keyof typeof roleLabels]}
        </Tag>
      ),
    },
    {
      title: t('subAccount.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: t('subAccount.lastLoginAt'),
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : t('subAccount.neverLoggedIn'),
    },
    {
      title: t('subAccount.actions'),
      key: 'actions',
      render: (_: any, record: SubAccount) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => startEdit(record)}
          >
            {t('subAccount.edit')}
          </Button>
          <Popconfirm
            title={t('subAccount.confirmDelete', { username: record.username })}
            description={t('subAccount.confirmDeleteDescription')}
            onConfirm={() => handleDeleteSubAccount(record.id)}
            okText={t('common.confirm')}
            cancelText={t('subAccount.cancel')}
          >
            <Button 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
            >
              {t('subAccount.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Check if current user has permission to manage sub-accounts
  if (userPermissions && !userPermissions.hasFullAccess) {
    return (
      <Card>
        <Alert
          type="warning"
          showIcon
          message={t('subAccount.accessDenied.title')}
          description={
            <div>
              <p>{t('subAccount.accessDenied.description')}</p>
              <div style={{ marginTop: 8 }}>
                <p>{t('subAccount.accessDenied.currentAccount')}</p>
                <p>{t('subAccount.accessDenied.username', { username: userPermissions.username })}</p>
                <p>{t('subAccount.accessDenied.role', { role: userPermissions.role })}</p>
              </div>
            </div>
          }
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>{t('subAccount.title')}</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setShowCreateForm(true)}
          >
            {t('subAccount.createSubAccount')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={subAccounts}
          rowKey="id"
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <p style={{ fontSize: '16px', marginBottom: 8 }}>{t('subAccount.noSubAccounts')}</p>
                <p style={{ color: '#666' }}>{t('subAccount.noSubAccountsDescription')}</p>
              </div>
            )
          }}
        />

        <Card style={{ marginTop: 16 }}>
          <Title level={4}>{t('subAccount.permissions.title')}</Title>
          <Space direction="vertical">
            <div><strong>{t('subAccount.roles.viewerDescription')}:</strong> {t('subAccount.permissions.viewer')}</div>
            <div><strong>{t('subAccount.roles.editorDescription')}:</strong> {t('subAccount.permissions.editor')}</div>
            <div><strong>Owner:</strong> {t('subAccount.permissions.owner')}</div>
          </Space>
        </Card>
      </Card>

      <Modal
        title={editingAccount ? t('subAccount.editSubAccount') : t('subAccount.createNewSubAccount')}
        open={showCreateForm}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ role: 'viewer' }}
        >
          <Form.Item
            label={t('subAccount.username')}
            name="username"
            rules={[{ required: true, message: t('subAccount.form.usernameRequired') }]}
          >
            <Input 
              placeholder={t('subAccount.form.usernamePlaceholder')} 
              disabled={!!editingAccount}
            />
          </Form.Item>

          <Form.Item
            label={editingAccount ? t('subAccount.passwordOptional') : t('subAccount.password')}
            name="password"
            rules={editingAccount ? [] : [{ required: true, message: t('subAccount.form.passwordRequired') }]}
          >
            <Input.Password placeholder={t('subAccount.form.passwordPlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('subAccount.role')}
            name="role"
            rules={[{ required: true, message: t('subAccount.form.roleRequired') }]}
          >
            <Select>
              <Option value="viewer">{t('subAccount.roles.viewerDescription')}</Option>
              <Option value="editor">{t('subAccount.roles.editorDescription')}</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingAccount ? t('subAccount.update') : t('subAccount.create')}
              </Button>
              <Button onClick={handleCancel}>{t('subAccount.cancel')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubAccountManager;