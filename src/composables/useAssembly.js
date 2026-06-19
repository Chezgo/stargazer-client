import { ref } from 'vue';
import { useRouter } from 'vue-router';
import userAssembliesApi from '@/services/userAssemblies';

export function useAssembly(assemblyId) {
  const router = useRouter();
  const assembly = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const showEditModal = ref(false);
  const submitting = ref(false);
  const form = ref({ name: '', description: '' });

  const fetchAssembly = async () => {
    loading.value = true;
    error.value = null;
    try {
      assembly.value = await userAssembliesApi.getById(assemblyId.value);
    } catch (err) {
      error.value = err.response?.data?.message || 'Не удалось загрузить сборку';
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  const openEditModal = () => {
    form.value = { 
      name: assembly.value.name, 
      description: assembly.value.description 
    };
    showEditModal.value = true;
  };

  const closeEditModal = () => { 
    showEditModal.value = false; 
  };

  const submitEdit = async () => {
    submitting.value = true;
    try {
      await userAssembliesApi.update(assemblyId.value, form.value);
      closeEditModal();
      await fetchAssembly();
    } catch (err) {
      alert('❌ Ошибка: ' + (err.response?.data?.message || err.message));
    } finally {
      submitting.value = false;
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Удалить сборку "${assembly.value.name}"?`)) return;
    try {
      await userAssembliesApi.delete(assemblyId.value);
      router.replace('/assemblies');
    } catch (err) {
      alert('❌ Ошибка удаления: ' + (err.response?.data?.message || err.message));
    }
  };

  return {
    assembly,
    loading,
    error,
    showEditModal,
    submitting,
    form,
    fetchAssembly,
    openEditModal,
    closeEditModal,
    submitEdit,
    handleDelete
  };
}