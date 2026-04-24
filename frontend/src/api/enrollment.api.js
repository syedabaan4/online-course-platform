import api from './axios';

export const enrollInCourse = async (courseId) => {
	try {
		const response = await api.post('/enrollments', { courseId });
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getMyEnrollments = async () => {
	try {
		const response = await api.get('/enrollments/my');
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const checkEnrollment = async (courseId) => {
	try {
		const response = await api.get(`/enrollments/check/${courseId}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const unenrollFromCourse = async (courseId) => {
	try {
		const response = await api.delete(`/enrollments/${courseId}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};
