"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { API_URL } from '@/lib/apiConfig';

const TournamentImagesContext = createContext();

export const useTournamentImages = () => {
  const context = useContext(TournamentImagesContext);
  if (!context) {
    throw new Error('useTournamentImages must be used within TournamentImagesProvider');
  }
  return context;
};

export const TournamentImagesProvider = ({ children }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTournamentImages();
  }, []);

  const fetchTournamentImages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tournament-images`);
      
      if (response.ok) {
        const data = await response.json();
        setImages(data.data || []);
        setError(null);
      } else {
        throw new Error("Failed to fetch tournament images");
      }
    } catch (err) {
      console.error("Error fetching tournament images:", err);
      setError("Unable to load tournament images");
      
      // Fallback to default images if API fails
      setImages([
        {
          name: "Makenahalli Premier League",
          location: "Makenahalli",
          year: "2025",
          teams: "10 Teams",
          imageUrl: "/tournaments/t1_v2.jpg"
        },
        {
          name: "Jakanachari Cup",
          location: "Tumkur",
          year: "2024",
          teams: "10 Teams",
          imageUrl: "/tournaments/t2_v2.jpg"
        },
        {
          name: "Chettanahalli Premier League",
          location: "Chettanahalli",
          year: "2024",
          teams: "10 Teams",
          imageUrl: "/tournaments/t3_v2.jpg"
        },
        {
          name: "Koratagere Premier League",
          location: "Koratagere",
          year: "2025",
          teams: "10 Teams",
          imageUrl: "/tournaments/t4_v2.jpg"
        },
        {
          name: "Makenahalli Premier League",
          location: "Makenahalli",
          year: "2025",
          teams: "10 Teams",
          imageUrl: "/tournaments/t5_v2.jpg"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const refreshImages = () => {
    setLoading(true);
    fetchTournamentImages();
  };

  return (
    <TournamentImagesContext.Provider value={{ images, loading, error, refreshImages }}>
      {children}
    </TournamentImagesContext.Provider>
  );
};
