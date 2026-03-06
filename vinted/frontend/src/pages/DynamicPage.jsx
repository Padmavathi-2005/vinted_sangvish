import React, { useState, useEffect } from 'react';
import { Container, Spinner, Card } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';

const DynamicPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(`/api/pages/${slug}`);
                setPage(data);
            } catch (error) {
                console.error('Page not found', error);
                navigate('/404'); // Redirect to 404 if page slug doesn't exist
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchPage();
        }
    }, [slug, navigate]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (!page) return null;

    return (
        <Container className="py-5">
            <h1 className="fw-bold mb-4" style={{ color: 'var(--primary-color)' }}>{page.title}</h1>
            <Card className="border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '15px' }}>
                {/* Notice dangerouslySetInnerHTML is required to render HTML stored by React Quill */}
                <div
                    className="page-content ql-editor px-0"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            </Card>
        </Container>
    );
};

export default DynamicPage;
