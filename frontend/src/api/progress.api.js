import api from './axios';

export const markLectureComplete = async (lectureId, isComplete = true) => {
	try {
		const response = await api.post('/progress', { lectureId, isComplete });
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getCourseProgress = async (courseId) => {
	try {
		const response = await api.get(`/progress/course/${courseId}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getCourseProgressDetails = async (courseId) => {
	try {
		const response = await api.get(`/progress/course/${courseId}/details`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getNextIncompleteLecture = async (courseId) => {
	try {
		const response = await api.get(`/progress/course/${courseId}/next`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};
