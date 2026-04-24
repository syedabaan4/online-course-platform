import api from './axios';

export const checkCompletion = async (courseId) => {
	try {
		const response = await api.get(`/certificates/check/${courseId}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const generateCertificate = async (courseId) => {
	try {
		const response = await api.post('/certificates/generate', { courseId });
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getMyCertificates = async () => {
	try {
		const response = await api.get('/certificates/my');
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getCertificateById = async (certificateId) => {
	try {
		const response = await api.get(`/certificates/${certificateId}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getDownloadUrl = (certificateId) => {
	return `http://localhost:5000/api/certificates/${certificateId}/download`;
};
