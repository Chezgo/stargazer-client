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
  const searchSource = ref([]);
  const searchSourceKey = ref('');

  const loadBrands = async () => {
    try {
      brands.value = await brandsApi.getAll();
    } catch (err) {
      console.warn('⚠️ Не удалось загрузить бренды:', err);
    }
  };

  const getBaseParams = (page, size) => {
    const params = {
      page,
      size,
      idTypeDetail: selectedType.value?.id
    };

    if (filters.value.brandId) {
      params.idBrandDetail = filters.value.brandId;
    }

    return params;
  };

  const applySearchPage = () => {
    const query = filters.value.search.trim().toLocaleLowerCase('ru-RU');
    const matches = searchSource.value.filter((detail) =>
      (detail.nameDetail || '').toLocaleLowerCase('ru-RU').includes(query)
    );
    catalogTotalPages.value = Math.max(1, Math.ceil(matches.length / catalogPageSize.value));
    const start = catalogPage.value * catalogPageSize.value;
    catalogDetails.value = matches.slice(start, start + catalogPageSize.value);
  };

  const loadSearchSource = async () => {
    const key = `${selectedType.value?.id || ''}:${filters.value.brandId || ''}`;
    if (searchSourceKey.value === key) return;

    const batchSize = 100;
    const firstPage = await detailsInfoApi.getAll(getBaseParams(0, batchSize));
    const totalPages = firstPage.totalPages || 1;
    const remainingPages = totalPages > 1
      ? await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          detailsInfoApi.getAll(getBaseParams(index + 1, batchSize))
        )
      )
      : [];

    searchSource.value = [
      ...(firstPage.content || []),
      ...remainingPages.flatMap((page) => page.content || [])
    ];
    searchSourceKey.value = key;
  };

  const fetchCatalogDetails = async () => {
    catalogLoading.value = true;
    catalogError.value = null;
    
    try {
      if (filters.value.search.trim()) {
        await loadSearchSource();
        applySearchPage();
      } else {
        const data = await detailsInfoApi.getAll(
          getBaseParams(catalogPage.value, catalogPageSize.value)
        );
        catalogDetails.value = data.content || [];
        catalogTotalPages.value = data.totalPages || 1;
      }
      
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
      if (filters.value.search.trim()) applySearchPage();
      else fetchCatalogDetails();
    }
  };

  const nextCatalogPage = () => {
    if (catalogPage.value < catalogTotalPages.value - 1) {
      catalogPage.value++;
      if (filters.value.search.trim()) applySearchPage();
      else fetchCatalogDetails();
    }
  };

  const searchCatalog = () => {
    catalogPage.value = 0;
    fetchCatalogDetails();
  };

  const resetFilters = () => {
    filters.value = { brandId: '', search: '' };
    catalogPage.value = 0;
    searchSourceKey.value = '';
    fetchCatalogDetails();
  };

  const openAddDetailModal = async (type) => {
    selectedType.value = type;
    showAddDetailModal.value = true;
    catalogPage.value = 0;
    filters.value = { brandId: '', search: '' };
    searchSource.value = [];
    searchSourceKey.value = '';
    
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
    searchCatalog,
    prevCatalogPage,
    nextCatalogPage,
    resetFilters,
    openAddDetailModal,
    closeAddDetailModal
  };
}
