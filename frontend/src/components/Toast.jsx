import Swal from 'sweetalert2';
import { confirmAction as confirmActionImpl } from './confirmRegistry';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
});

export function showSuccess(message) {
  toast.fire({ icon: 'success', title: message });
}

export function showError(message) {
  toast.fire({ icon: 'error', title: message || 'Something went wrong' });
}

export function confirmAction(title, text, options = {}) {
  return confirmActionImpl(title, text, options);
}

export default toast;