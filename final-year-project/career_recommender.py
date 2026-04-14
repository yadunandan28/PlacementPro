import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from typing import List, Dict, Tuple
import warnings
warnings.filterwarnings('ignore')


class CareerRecommendationSystem:
    """
    A content-based recommendation system that matches student skills 
    and career interests with relevant job opportunities from alumni data.
    
    Uses TF-IDF vectorization and cosine similarity for retrieval.
    """
    
    def __init__(self, max_features=5000, ngram_range=(1, 2), min_df=2):
        """
        Initialize the recommendation system.
        
        Args:
            max_features: Maximum number of features for TF-IDF
            ngram_range: Range of n-grams to extract
            min_df: Minimum document frequency for terms
        """
        self.vectorizer = TfidfVectorizer(
            ngram_range=ngram_range,
            max_features=max_features,
            min_df=min_df,
            stop_words='english',
            lowercase=True
        )
        self.job_vectors = None
        self.job_data = None
        self.is_fitted = False
    
    def _create_text_features(self, job_df: pd.DataFrame) -> pd.Series:
        """
        Combine relevant job features into a single text representation.
        
        Args:
            job_df: DataFrame containing job information
            
        Returns:
            Series of combined text features
        """
        # Combine multiple fields with appropriate weighting
        text_features = (
            job_df['job_title'].fillna('') + " " +
            job_df['job_title'].fillna('') + " " +  # Double weight for title
            job_df['required_skills'].fillna('') + " " +
            job_df['required_skills'].fillna('') + " " +  # Double weight for skills
            job_df.get('industry', '').fillna('') + " " +
            job_df.get('job_description_length', '').astype(str)
        ).str.lower()
        
        return text_features
    
    def fit(self, job_df: pd.DataFrame):
        """
        Build the searchable index from job postings.
        
        Args:
            job_df: DataFrame with columns: job_id, job_title, company_name, 
                    required_skills, and optionally description, category
        
        Returns:
            self
        """
        # Validate required columns
        required_cols = ['job_title', 'required_skills']
        missing_cols = [col for col in required_cols if col not in job_df.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Store job data
        self.job_data = job_df.copy().reset_index(drop=True)
        
        # Create text features and vectorize
        text_features = self._create_text_features(job_df)
        self.job_vectors = self.vectorizer.fit_transform(text_features)
        
        self.is_fitted = True
        print(f"✓ System fitted on {len(job_df)} job postings")
        print(f"✓ Vocabulary size: {len(self.vectorizer.vocabulary_)}")
        print(f"✓ Unique job titles: {job_df['job_title'].nunique()}")
        
        return self
    
    def recommend(self, user_skills: str, desired_role: str = "", 
                  top_k: int = 5, min_score: float = 0.0, 
                  return_job_ids: bool = False) -> pd.DataFrame:
        """
        Find best matching jobs for a user profile.
        
        Args:
            user_skills: Comma-separated string of user's skills
            desired_role: Target job role/title (optional)
            top_k: Number of recommendations to return
            min_score: Minimum relevance score threshold (0-100)
            return_job_ids: Whether to include job_id in output
            
        Returns:
            DataFrame with recommended jobs and relevance scores
        """
        if not self.is_fitted:
            raise ValueError("System must be fitted before making recommendations")
        
        # Create query by combining role and skills
        query = f"{desired_role} {desired_role} {user_skills}".lower().strip()
        
        # Vectorize query
        query_vec = self.vectorizer.transform([query])
        
        # Compute similarities with all jobs
        similarities = cosine_similarity(query_vec, self.job_vectors)[0]
        
        # Get top-k indices
        top_k = min(top_k, len(similarities))
        top_indices = similarities.argsort()[-top_k:][::-1]
        
        # Create results DataFrame
        results = self.job_data.iloc[top_indices].copy()
        results['relevance_score'] = similarities[top_indices] * 100
        
        # Filter by minimum score
        results = results[results['relevance_score'] >= min_score]
        
        # Select output columns
        output_cols = ['job_title', 'company_name', 'required_skills', 'relevance_score']
        if return_job_ids:
            output_cols.insert(0, 'job_id')
        
        available_cols = [col for col in output_cols if col in results.columns]
        
        return results[available_cols].reset_index(drop=True)
    
    def _normalize_skill(self, skill: str) -> str:
        """Normalize a skill string for comparison."""
        # Remove special chars, lowercase, strip whitespace
        return re.sub(r'[^a-z0-9\s]', '', skill.lower().strip())
    
    def get_skill_gaps(self, user_skills: str, target_job_id) -> Dict:
        """
        Identify skill gaps between user and a specific job.
        
        Args:
            user_skills: User's current skills (comma-separated)
            target_job_id: ID of the target job (can be int or string)
            
        Returns:
            Dictionary with matching skills and missing skills
        """
        if not self.is_fitted:
            raise ValueError("System must be fitted first")
        
        # Find target job (handle both int and string IDs)
        target_job = self.job_data[self.job_data['job_id'] == target_job_id]
        if target_job.empty:
            raise ValueError(f"Job ID {target_job_id} not found")
        
        # Parse and normalize skills
        user_skill_list = [s.strip() for s in user_skills.split(',')]
        user_skill_set = set([self._normalize_skill(s) for s in user_skill_list])
        
        required_skills = target_job.iloc[0]['required_skills']
        required_skill_list = [s.strip() for s in str(required_skills).split(',')]
        required_skill_set = set([self._normalize_skill(s) for s in required_skill_list])
        
        # Remove empty strings
        user_skill_set.discard('')
        required_skill_set.discard('')
        
        matching = user_skill_set & required_skill_set
        missing = required_skill_set - user_skill_set
        extra = user_skill_set - required_skill_set
        
        return {
            'job_title': target_job.iloc[0]['job_title'],
            'company': target_job.iloc[0].get('company_name', 'Unknown'),
            'matching_skills': sorted(list(matching)),
            'missing_skills': sorted(list(missing)),
            'additional_skills': sorted(list(extra)),
            'match_percentage': (len(matching) / len(required_skill_set) * 100 
                               if required_skill_set else 0)
        }