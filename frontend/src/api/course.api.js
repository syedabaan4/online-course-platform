import api from './axios';

export const getPublishedCourses = async (filters = {}) => {
	try {
		const params = {
			search: filters.search || '',
			category: filters.category || '',
			difficulty: filters.difficulty || '',
		};
		const response = await api.get('/courses', { params });
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getCourseById = async (id) => {
	try {
		const response = await api.get(`/courses/${id}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getMyCourses = async () => {
	try {
		const response = await api.get('/courses/my');
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const createCourse = async (data) => {
	try {
		const response = await api.post('/courses', data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const updateCourse = async (id, data) => {
	try {
		const response = await api.put(`/courses/${id}`, data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const deleteCourse = async (id) => {
	try {
		const response = await api.delete(`/courses/${id}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const publishCourse = async (id) => {
	try {
		const response = await api.put(`/courses/${id}/publish`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const createModule = async (data) => {
	try {
		const response = await api.post('/modules', data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const updateModule = async (id, data) => {
	try {
		const response = await api.put(`/modules/${id}`, data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const deleteModule = async (id) => {
	try {
		const response = await api.delete(`/modules/${id}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getModulesByCourse = async (courseId) => {
	try {
		const response = await api.get(`/modules/course/${courseId}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const createLecture = async (data) => {
	try {
		const response = await api.post('/lectures', data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const updateLecture = async (id, data) => {
	try {
		const response = await api.put(`/lectures/${id}`, data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const deleteLecture = async (id) => {
	try {
		const response = await api.delete(`/lectures/${id}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const createResource = async (formData) => {
	try {
		const response = await api.post('/resources', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const deleteResource = async (id) => {
	try {
		const response = await api.delete(`/resources/${id}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};
