import Swal from 'sweetalert2';

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

export async function confirmAction(title, text) {
  const result = await Swal.fire({
    title, text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: 'var(--accent)',
    cancelButtonColor: 'var(--error)',
    confirmButtonText: 'Yes, do it',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
  });
  return result.isConfirmed;
}

export default toast;