import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, DatePicker, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { GuildMember } from '../types';
import { classesApi } from '../services/api';
import dayjs from 'dayjs';

interface ClassInfo {
  id: string;
  name: string;
}

interface GuildMemberFormProps {
  visible: boolean;
  member?: GuildMember | null;
  onCancel: () => void;
  onSuccess: () => void;
  onAddMember?: (member: Omit<GuildMember, 'id'>) => Promise<GuildMember>;
  onUpdateMember?: (id: number, member: Partial<GuildMember>) => Promise<GuildMember>;
}

const GuildMemberForm: React.FC<GuildMemberFormProps> = ({
  visible,
  member,
  onCancel,
  onSuccess,
  onAddMember,
  onUpdateMember,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const isEditing = !!member;

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

  // Initialize loading class data
  useEffect(() => {
    if (visible) {
      loadClasses();
    }
  }, [visible]);

  // Form submission handling
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Handle date format conversion
      if (values.createdAt) {
        values.createdAt = dayjs(values.createdAt).toISOString();
      }
      
      if (isEditing && member && member.id && onUpdateMember) {
        await onUpdateMember(member.id, values);
        message.success(t('guildMember.form.messages.updateSuccess'));
      } else if (onAddMember) {
        await onAddMember(values);
        message.success(t('guildMember.form.messages.addSuccess'));
      }
      
      onSuccess();
      form.resetFields();
    } catch (error) {
      console.error(t('guildMember.form.messages.submitError'), error);
    }
  };

  // Fill form data when in edit mode
  useEffect(() => {
    if (visible && member) {
      const formData = {
        ...member,
        createdAt: member.createdAt ? dayjs(member.createdAt) : undefined,
      };
      form.setFieldsValue(formData);
    } else if (visible && !member) {
      form.resetFields();
    }
  }, [visible, member, form]);

  return (
    <Modal
      title={isEditing ? t('guildMember.form.title.edit') : t('guildMember.form.title.add')}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText={t('guildMember.form.buttons.confirm')}
      cancelText={t('guildMember.form.buttons.cancel')}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="name"
          label={t('guildMember.form.labels.name')}
          rules={[{ required: true, message: t('guildMember.form.validation.nameRequired') }]}
        >
          <Input placeholder={t('guildMember.form.placeholders.name')} />
        </Form.Item>



        <Form.Item
          name="class"
          label={t('guildMember.form.labels.class')}
        >
          <Select 
            placeholder={t('guildMember.form.placeholders.class')} 
            allowClear
            loading={loadingClasses}
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            style={{ cursor: 'pointer' }}
          >
            {classes.map(classInfo => (
              <Select.Option key={classInfo.id} value={classInfo.name}>
                {classInfo.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="createdAt"
          label={t('guildMember.form.labels.createdAt', 'Member Creation Time')}
        >
          <DatePicker 
            placeholder={t('guildMember.form.placeholders.createdAt', 'Please select creation date')}
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        </Form.Item>

        <Form.Item
          name="sort"
          label={t('guildMember.form.labels.sort', 'Sort Order')}
        >
          <InputNumber 
            placeholder={t('guildMember.form.placeholders.sort', 'Please enter sort value')}
            style={{ width: '100%' }}
            min={0}
          />
        </Form.Item>

      </Form>
    </Modal>
  );
};

export default GuildMemberForm;