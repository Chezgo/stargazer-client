import { ref, computed } from 'vue';
import assemblyDetailsApi from '@/services/assemblyDetails';
import detailsInfoApi from '@/services/detailsInfo';

export function useAssemblyDetails(assemblyId) {
  const assemblyDetails = ref([]);
  const detailsLoading = ref(false);
  const detailsError = ref(null);
  const showEditDetailModal = ref(false);
  const submittingDetail = ref(false);
  const editDetailForm = ref({ description: '' });
  const selectedAssemblyDetail = ref(null);

  const groupedAssemblyDetails = computed(() => {
    return assemblyDetails.value.reduce((groups, item) => {
      const typeName = item.detailInfo?.nameType || 'Другое';
      if (!groups[typeName]) {
        groups[typeName] = [];
      }
      groups[typeName].push(item);
      return groups;
    }, {});
  });

  const fetchAssemblyDetails = async () => {
    detailsLoading.value = true;
    detailsError.value = null;
    
    try {
      const items = await assemblyDetailsApi.getByAssemblyId(assemblyId.value);
      
      const enriched = await Promise.all(
        items.map(async (item) => {
          try {
            const info = await detailsInfoApi.getById(item.idTelescopeDetail);
            return { ...item, detailInfo: info };
          } catch (err) {
            console.warn(`⚠️ Не удалось загрузить инфо о детали #${item.idTelescopeDetail}`);
            return { ...item, detailInfo: null };
          }
        })
      );
      
      assemblyDetails.value = enriched;
      
    } catch (err) {
      detailsError.value = 'Не удалось загрузить детали сборки';
      console.error(err);
    } finally {
      detailsLoading.value = false;
    }
  };

  const openEditDetailModal = (item) => {
    selectedAssemblyDetail.value = item;
    editDetailForm.value = { description: item.description || '' };
    showEditDetailModal.value = true;
  };

  const closeEditDetailModal = () => {
    showEditDetailModal.value = false;
    selectedAssemblyDetail.value = null;
  };

  const submitEditDetail = async () => {
    if (!selectedAssemblyDetail.value) return;
    
    submittingDetail.value = true;
    try {
      await assemblyDetailsApi.updateInAssembly(
        assemblyId.value,
        selectedAssemblyDetail.value.id,
        { description: editDetailForm.value.description }
      );
      
      closeEditDetailModal();
      await fetchAssemblyDetails();
      
    } catch (err) {
      alert('❌ Ошибка: ' + (err.response?.data?.message || err.message));
    } finally {
      submittingDetail.value = false;
    }
  };

  const handleRemoveDetail = async (detailId) => {
    if (!confirm('Удалить эту деталь из сборки?')) return;
    
    try {
      await assemblyDetailsApi.removeFromAssembly(assemblyId.value, detailId);
      await fetchAssemblyDetails();
    } catch (err) {
      alert('❌ Ошибка удаления: ' + (err.response?.data?.message || err.message));
    }
  };

  return {
    assemblyDetails,
    detailsLoading,
    detailsError,
    showEditDetailModal,
    submittingDetail,
    editDetailForm,
    selectedAssemblyDetail,
    groupedAssemblyDetails,
    fetchAssemblyDetails,
    openEditDetailModal,
    closeEditDetailModal,
    submitEditDetail,
    handleRemoveDetail
  };
}