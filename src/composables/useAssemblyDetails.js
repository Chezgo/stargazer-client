import { ref, computed } from 'vue';
import assemblyDetailsApi from '@/services/assemblyDetails';
import detailsInfoApi from '@/services/detailsInfo';

export function useAssemblyDetails(assemblyId) {
  const assemblyDetails = ref([]);
  const detailsLoading = ref(false);
  const detailsError = ref(null);

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
    groupedAssemblyDetails,
    fetchAssemblyDetails,
    handleRemoveDetail
  };
}
