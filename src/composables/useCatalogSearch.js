import { ref } from 'vue';
import detailsInfoApi from '@/services/detailsInfo';
import brandsApi from '@/services/brands';

export function useCatalogSearch() {
  const showAddDetailModal = ref(false);
  const selectedType = ref(null);
  const catalogDetails = ref([]);
  const catalogLoading = ref(false);
  const catalogError = ref(null);
  const catalogPage = ref(0);
  const catalogTotalPages = ref(1);
  const catalogPageSize = ref(8);
  const filters = ref({ brandId: '', search: '' });
  const brands = ref([]);

  const loadBrands = async () => {
    try {
      brands.value = await brandsApi.getAll();
    } catch (err) {
      console.warn('⚠️ Не удалось загрузить бренды:', err);
    }
  };

  const fetchCatalogDetails = async () => {
    catalogLoading.value = true;
    catalogError.value = null;
    
    try {
      const params = {
        page: catalogPage.value,
        size: catalogPageSize.value,
        idTypeDetail: selectedType.value?.id,
      };
      
      if (filters.value.brandId) {
        params.idBrandDetail = filters.value.brandId;
      }
      if (filters.value.search) {
        params.search = filters.value.search;
      }
      
      const data = await detailsInfoApi.getAll(params);
      catalogDetails.value = data.content || [];
      catalogTotalPages.value = data.totalPages || 1;
      
    } catch (err) {
      catalogError.value = 'Не удалось загрузить детали';
      console.error(err);
    } finally {
      catalogLoading.value = false;
    }
  };

  const prevCatalogPage = () => {
    if (catalogPage.value > 0) {
      catalogPage.value--;
      fetchCatalogDetails();
    }
  };

  const nextCatalogPage = () => {
    if (catalogPage.value < catalogTotalPages.value - 1) {
      catalogPage.value++;
      fetchCatalogDetails();
    }
  };

  const resetFilters = () => {
    filters.value = { brandId: '', search: '' };
    catalogPage.value = 0;
    fetchCatalogDetails();
  };

  const openAddDetailModal = async (type) => {
    selectedType.value = type;
    showAddDetailModal.value = true;
    catalogPage.value = 0;
    filters.value = { brandId: '', search: '' };
    
    if (brands.value.length === 0) {
      await loadBrands();
    }
    
    await fetchCatalogDetails();
  };

  const closeAddDetailModal = () => {
    showAddDetailModal.value = false;
    selectedType.value = null;
  };

  return {
    showAddDetailModal,
    selectedType,
    catalogDetails,
    catalogLoading,
    catalogError,
    catalogPage,
    catalogTotalPages,
    filters,
    brands,
    loadBrands,
    fetchCatalogDetails,
    prevCatalogPage,
    nextCatalogPage,
    resetFilters,
    openAddDetailModal,
    closeAddDetailModal
  };
}