import Swal from 'sweetalert2';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#FFFFFF',
  color: '#0F172A',
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
    confirmButtonColor: '#256AF4',
    cancelButtonColor: '#EF4444',
    confirmButtonText: 'Yes, do it',
    background: '#FFFFFF',
    color: '#0F172A',
  });
  return result.isConfirmed;
}

export default toast;