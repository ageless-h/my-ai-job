// -*- coding: utf-8 -*-
import { defineStore } from "pinia";
import { ref } from "vue";

export const ProductStore = defineStore("ProductStore", () => {
  const showProduct = ref(false);

  function setShowProduct(show: boolean): void {
    showProduct.value = show;
  }

  return {
    showProduct,
    setShowProduct
  };
});
