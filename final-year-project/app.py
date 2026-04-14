import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')

# Import your recommendation system
# Make sure career_recommender.py is in the same directory
from career_recommender import CareerRecommendationSystem

# ============================================================================
# PAGE CONFIG
# ============================================================================
st.set_page_config(
    page_title="AI Career Guidance Platform",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# CUSTOM CSS
# ============================================================================
st.markdown("""
    <style>
    .main {
        padding: 0rem 1rem;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 24px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 10px 20px;
        font-weight: 600;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 10px;
        color: white;
        margin: 10px 0;
    }
    .job-card {
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        padding: 20px;
        margin: 15px 0;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
    }
    .job-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-color: #667eea;
    }
    .score-badge {
        display: inline-block;
        padding: 5px 15px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 14px;
    }
    .score-high {
        background: #10b981;
        color: white;
    }
    .score-medium {
        background: #f59e0b;
        color: white;
    }
    .score-low {
        background: #ef4444;
        color: white;
    }
    .skill-tag {
        display: inline-block;
        background: #e0e7ff;
        color: #4338ca;
        padding: 4px 12px;
        border-radius: 15px;
        margin: 3px;
        font-size: 13px;
    }
    .skill-match {
        background: #d1fae5;
        color: #065f46;
    }
    .skill-missing {
        background: #fee2e2;
        color: #991b1b;
    }
    </style>
""", unsafe_allow_html=True)

# ============================================================================
# LOAD AND CACHE DATA
# ============================================================================
@st.cache_data
def load_data():
    """Load and prepare the dataset"""
    try:
        df = pd.read_csv('ai_job_dataset.csv')
        
        # Only create job_id if it doesn't exist
        # Preserve the original job_id column if it exists (even if it's strings)
        if 'job_id' not in df.columns:
            df['job_id'] = range(len(df))
        
        return df
    except FileNotFoundError:
        st.error("❌ Dataset 'ai_job_dataset.csv' not found. Please ensure the file is in the same directory.")
        st.stop()

@st.cache_resource
def load_model(df):
    """Train and cache the recommendation system"""
    try:
        # Split data
        title_counts = df['job_title'].value_counts()
        df['title_group'] = df['job_title'].apply(
            lambda x: x if title_counts[x] >= 10 else 'Other'
        )
        
        train_df, test_df = train_test_split(
            df, test_size=0.2, random_state=42,
            stratify=df['title_group'], shuffle=True
        )
        
        train_df = train_df.drop('title_group', axis=1)
        
        # Train system
        system = CareerRecommendationSystem(max_features=5000, ngram_range=(1, 2), min_df=2)
        system.fit(train_df)
        
        return system, train_df
    except Exception as e:
        st.error(f"Error loading model: {str(e)}")
        st.stop()

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def get_score_class(score):
    """Return CSS class based on score"""
    if score >= 60:
        return "score-high"
    elif score >= 40:
        return "score-medium"
    else:
        return "score-low"

def render_job_card(job, index):
    """Render a job recommendation card"""
    score_class = get_score_class(job['relevance_score'])
    
    st.markdown(f"""
        <div class="job-card">
            <h3>#{index} {job['job_title']}</h3>
            <p style="color: #6b7280; font-size: 16px;">📍 {job['company_name']}</p>
            <div style="margin: 15px 0;">
                <span class="score-badge {score_class}">
                    Match Score: {job['relevance_score']:.1f}%
                </span>
            </div>
            <p style="margin-top: 10px;"><strong>Required Skills:</strong></p>
            <div style="margin-top: 5px;">
    """, unsafe_allow_html=True)
    
    # Display skills as tags
    skills = str(job['required_skills']).split(',')
    for skill in skills[:10]:  # Show first 10 skills
        st.markdown(f'<span class="skill-tag">{skill.strip()}</span>', unsafe_allow_html=True)
    
    st.markdown("</div></div>", unsafe_allow_html=True)

def render_skill_gap_analysis(gap_data):
    """Render skill gap analysis with visual indicators"""
    st.markdown(f"""
        <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>🎯 Skill Gap Analysis</h3>
            <p><strong>Target Role:</strong> {gap_data['job_title']} @ {gap_data['company']}</p>
            <div style="margin: 20px 0;">
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h4 style="color: #10b981;">✓ Matching Skills ({len(gap_data['matching_skills'])} skills)</h4>
    """, unsafe_allow_html=True)
    
    if gap_data['matching_skills']:
        for skill in gap_data['matching_skills']:
            st.markdown(f'<span class="skill-tag skill-match">{skill}</span>', unsafe_allow_html=True)
    else:
        st.markdown('<p style="color: #6b7280;">No matching skills found</p>', unsafe_allow_html=True)
    
    st.markdown(f"""
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h4 style="color: #ef4444;">⚠️ Skills to Learn ({len(gap_data['missing_skills'])} skills)</h4>
    """, unsafe_allow_html=True)
    
    if gap_data['missing_skills']:
        for skill in gap_data['missing_skills']:
            st.markdown(f'<span class="skill-tag skill-missing">{skill}</span>', unsafe_allow_html=True)
    else:
        st.markdown('<p style="color: #6b7280;">You have all required skills!</p>', unsafe_allow_html=True)
    
    st.markdown(f"""
                </div>
            </div>
            <div style="margin-top: 20px;">
                <h4>📊 Overall Match: {gap_data['match_percentage']:.1f}%</h4>
                <div style="background: #e5e7eb; border-radius: 10px; height: 30px; margin-top: 10px;">
                    <div style="background: linear-gradient(90deg, #10b981, #059669); 
                                width: {gap_data['match_percentage']:.1f}%; 
                                height: 100%; 
                                border-radius: 10px;
                                transition: width 0.5s ease;">
                    </div>
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)

# ============================================================================
# MAIN APP
# ============================================================================
def main():
    # Sidebar
    with st.sidebar:
        st.image("https://img.icons8.com/fluency/96/000000/graduation-cap.png", width=80)
        st.title("🎓 Career Guidance")
        st.markdown("---")
        
        st.markdown("""
        ### About This Tool
        This AI-powered platform helps students:
        - 🎯 Find matching job opportunities
        - 📊 Analyze skill gaps
        - 🚀 Plan career development
        
        ### How It Works
        1. Enter your skills
        2. Specify desired role
        3. Get personalized recommendations
        4. Analyze skill gaps
        
        ### Dataset Info
        - **Total Jobs:** 15,000
        - **Job Categories:** 20
        - **Focus:** AI/Data Science
        """)
        
        st.markdown("---")
        st.markdown("Built with ❤️ using Streamlit")
    
    # Main content
    st.title("🚀 AI Career Guidance Platform")
    st.markdown("### Find Your Perfect Career Match")
    
    # Load data and model
    with st.spinner("🔄 Loading dataset and training model..."):
        df = load_data()
        system, train_df = load_model(df)
    
    # Create tabs
    tab1, tab2, tab3, tab4 = st.tabs([
        "🎯 Get Recommendations", 
        "🔍 Skill Gap Analysis", 
        "📊 Dataset Insights",
        "ℹ️ System Info"
    ])
    
    # ========================================================================
    # TAB 1: RECOMMENDATIONS
    # ========================================================================
    with tab1:
        st.markdown("### Find Jobs That Match Your Profile")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.markdown("#### 🎯 Your Profile")
            
            # Skill input
            user_skills = st.text_area(
                "Enter your skills (comma-separated)",
                placeholder="e.g., Python, Machine Learning, SQL, Git, TensorFlow",
                help="List all your technical and soft skills separated by commas",
                height=100
            )
            
            # Role input
            desired_role = st.text_input(
                "Desired job role (optional)",
                placeholder="e.g., Data Scientist, Software Engineer, ML Engineer",
                help="Specify your target role to get more relevant recommendations"
            )
        
        with col2:
            st.markdown("#### ⚙️ Settings")
            
            # Number of recommendations
            top_k = st.slider(
                "Number of recommendations",
                min_value=3,
                max_value=20,
                value=5,
                help="How many job recommendations to display"
            )
            
            # Minimum score threshold
            min_score = st.slider(
                "Minimum match score (%)",
                min_value=0,
                max_value=70,
                value=0,
                step=5,
                help="Filter out jobs below this match score"
            )
        
        # Quick skill templates
        st.markdown("#### 💡 Quick Templates")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            if st.button("🐍 Data Scientist", use_container_width=True):
                st.session_state.skills = "Python, Machine Learning, Pandas, NumPy, Statistics, SQL"
                st.session_state.role = "Data Scientist"
        
        with col2:
            if st.button("💻 Software Engineer", use_container_width=True):
                st.session_state.skills = "Python, Java, SQL, Git, REST APIs"
                st.session_state.role = "Software Engineer"
        
        with col3:
            if st.button("🤖 ML Engineer", use_container_width=True):
                st.session_state.skills = "Python, TensorFlow, PyTorch, Deep Learning, MLOps"
                st.session_state.role = "Machine Learning Engineer"
        
        with col4:
            if st.button("📊 Data Analyst", use_container_width=True):
                st.session_state.skills = "SQL, Python, Excel, PowerBI, Statistics"
                st.session_state.role = "Data Analyst"
        
        # Update inputs if template was used
        if 'skills' in st.session_state:
            user_skills = st.session_state.skills
            desired_role = st.session_state.role
            del st.session_state.skills
            del st.session_state.role
            st.rerun()
        
        st.markdown("---")
        
        # Search button
        if st.button("🔍 Find Matching Jobs", type="primary", use_container_width=True):
            if not user_skills.strip():
                st.warning("⚠️ Please enter at least one skill to get recommendations")
            else:
                with st.spinner("🔄 Finding best matches..."):
                    # Get recommendations
                    recommendations = system.recommend(
                        user_skills=user_skills,
                        desired_role=desired_role,
                        top_k=top_k,
                        min_score=min_score,
                        return_job_ids=True
                    )
                    
                    if len(recommendations) == 0:
                        st.warning("😕 No jobs found matching your criteria. Try:")
                        st.markdown("""
                        - Reducing the minimum match score
                        - Using broader skill terms (e.g., "Python" instead of "Python 3.9")
                        - Checking for typos in skills
                        """)
                    else:
                        # Success metrics
                        st.success(f"✅ Found {len(recommendations)} matching opportunities!")
                        
                        # Display metrics
                        metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
                        
                        with metric_col1:
                            st.metric("Jobs Found", len(recommendations))
                        
                        with metric_col2:
                            avg_score = recommendations['relevance_score'].mean()
                            st.metric("Avg Match", f"{avg_score:.1f}%")
                        
                        with metric_col3:
                            best_score = recommendations['relevance_score'].max()
                            st.metric("Best Match", f"{best_score:.1f}%")
                        
                        with metric_col4:
                            unique_companies = recommendations['company_name'].nunique()
                            st.metric("Companies", unique_companies)
                        
                        st.markdown("---")
                        
                        # Display recommendations
                        st.markdown("### 📋 Your Personalized Recommendations")
                        
                        for idx, (_, job) in enumerate(recommendations.iterrows(), 1):
                            render_job_card(job, idx)
                        
                        # Download option
                        st.markdown("---")
                        csv = recommendations.to_csv(index=False)
                        st.download_button(
                            label="📥 Download Results as CSV",
                            data=csv,
                            file_name="job_recommendations.csv",
                            mime="text/csv",
                            use_container_width=True
                        )
    
    # ========================================================================
    # TAB 2: SKILL GAP ANALYSIS
    # ========================================================================
    with tab2:
        st.markdown("### Identify Skills to Learn for Your Dream Job")
        
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.markdown("#### 🎯 Your Current Skills")
            user_skills_gap = st.text_area(
                "Enter your skills",
                placeholder="e.g., Python, SQL, Git",
                help="List your current skills",
                height=100,
                key="gap_skills"
            )
        
        with col2:
            st.markdown("#### 🎯 Target Job")
            
            # Get unique jobs for selection
            job_options = train_df.apply(
                lambda x: f"{x['job_title']} @ {x['company_name']} (ID: {x['job_id']})", 
                axis=1
            ).tolist()
            
            selected_job = st.selectbox(
                "Select a job to analyze",
                options=job_options,
                help="Choose a specific job posting to compare against"
            )
            
            # Extract job_id from selection (handle both string and int IDs)
            job_id_str = selected_job.split("ID: ")[1].rstrip(")")
            try:
                job_id = int(job_id_str)
            except ValueError:
                # If conversion fails, use the string ID as-is
                job_id = job_id_str
        
        if st.button("🔍 Analyze Skill Gap", type="primary", use_container_width=True):
            if not user_skills_gap.strip():
                st.warning("⚠️ Please enter your skills first")
            else:
                with st.spinner("🔄 Analyzing skill gaps..."):
                    try:
                        gap_data = system.get_skill_gaps(user_skills_gap, job_id)
                        render_skill_gap_analysis(gap_data)
                        
                        # Recommendations based on gap
                        st.markdown("---")
                        st.markdown("### 💡 Recommended Learning Path")
                        
                        if gap_data['missing_skills']:
                            st.info("Focus on learning these skills to qualify for this role:")
                            
                            priority_skills = gap_data['missing_skills'][:5]  # Top 5
                            
                            for idx, skill in enumerate(priority_skills, 1):
                                with st.expander(f"📚 {idx}. {skill.title()}", expanded=(idx==1)):
                                    st.markdown(f"""
                                    **Suggested Resources:**
                                    - 🎓 Online courses (Coursera, Udemy, edX)
                                    - 📖 Documentation and tutorials
                                    - 💻 Practice projects on GitHub
                                    - 🏆 Coding challenges (LeetCode, HackerRank)
                                    
                                    **Estimated Time:** 2-4 weeks of focused learning
                                    """)
                        else:
                            st.success("🎉 You already have all the required skills! You're ready to apply.")
                    
                    except Exception as e:
                        st.error(f"Error analyzing skill gap: {str(e)}")
    
    # ========================================================================
    # TAB 3: DATASET INSIGHTS
    # ========================================================================
    with tab3:
        st.markdown("### 📊 Explore Our Job Database")
        
        # Dataset overview
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Jobs", f"{len(df):,}")
        
        with col2:
            st.metric("Unique Roles", df['job_title'].nunique())
        
        with col3:
            st.metric("Companies", df['company_name'].nunique())
        
        with col4:
            st.metric("Training Set", f"{len(train_df):,}")
        
        st.markdown("---")
        
        # Job distribution
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("#### 📈 Top 10 Job Titles")
            top_jobs = df['job_title'].value_counts().head(10)
            
            fig = px.bar(
                x=top_jobs.values,
                y=top_jobs.index,
                orientation='h',
                labels={'x': 'Number of Postings', 'y': 'Job Title'},
                color=top_jobs.values,
                color_continuous_scale='Viridis'
            )
            fig.update_layout(
                showlegend=False,
                height=400,
                margin=dict(l=0, r=0, t=30, b=0)
            )
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            st.markdown("#### 🏢 Top 10 Hiring Companies")
            top_companies = df['company_name'].value_counts().head(10)
            
            fig = px.pie(
                values=top_companies.values,
                names=top_companies.index,
                hole=0.4
            )
            fig.update_layout(
                height=400,
                margin=dict(l=0, r=0, t=30, b=0)
            )
            st.plotly_chart(fig, use_container_width=True)
        
        st.markdown("---")
        
        # Most in-demand skills
        st.markdown("#### 🔥 Most In-Demand Skills")
        
        # Extract all skills
        all_skills = []
        for skills_str in df['required_skills'].dropna():
            skills = [s.strip().lower() for s in str(skills_str).split(',')]
            all_skills.extend(skills)
        
        skill_counts = pd.Series(all_skills).value_counts().head(20)
        
        fig = px.bar(
            x=skill_counts.values,
            y=skill_counts.index,
            orientation='h',
            labels={'x': 'Frequency', 'y': 'Skill'},
            color=skill_counts.values,
            color_continuous_scale='Blues',
            title="Top 20 Skills Across All Job Postings"
        )
        fig.update_layout(
            height=600,
            margin=dict(l=0, r=0, t=50, b=0),
            showlegend=False
        )
        st.plotly_chart(fig, use_container_width=True)
        
        # Sample data
        st.markdown("---")
        st.markdown("#### 🔍 Sample Job Postings")
        
        sample_size = st.slider("Number of samples to display", 5, 20, 10)
        sample_df = df.sample(min(sample_size, len(df)))[['job_title', 'company_name', 'required_skills']]
        st.dataframe(sample_df, use_container_width=True)
    
    # ========================================================================
    # TAB 4: SYSTEM INFO
    # ========================================================================
    with tab4:
        st.markdown("### ℹ️ About This Recommendation System")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.markdown("""
            #### 🤖 How It Works
            
            This career recommendation system uses **Content-Based Filtering** with:
            
            1. **TF-IDF Vectorization**: Converts job descriptions and skills into numerical vectors
            2. **Cosine Similarity**: Measures how similar your profile is to each job posting
            3. **Skill Matching**: Identifies gaps between your skills and job requirements
            
            #### 🎯 Key Features
            
            - ✅ **Fast Recommendations**: Real-time results without GPU requirements
            - ✅ **Interpretable Scores**: Clear percentage-based match scores
            - ✅ **Skill Gap Analysis**: See exactly what skills you need to learn
            - ✅ **Personalized Results**: Tailored to your specific profile
            
            #### 📚 Technical Details
            
            - **Algorithm**: TF-IDF + Cosine Similarity
            - **Features**: Job titles, required skills, descriptions
            - **Training Data**: 12,000 job postings (80% of dataset)
            - **Test Data**: 3,000 job postings (20% validation set)
            
            #### 🎓 Model Performance
            
            - **Role Matching Accuracy**: 75%
            - **Average Match Score**: 43.3%
            - **Vocabulary Size**: 4,890 unique terms
            - **Coverage**: Specialized for AI/Data Science roles
            """)
        
        with col2:
            st.markdown("""
            #### 💪 Strengths
            
            ✓ Fast and efficient  
            ✓ No training required  
            ✓ Interpretable results  
            ✓ Skill gap analysis  
            ✓ Real-time updates  
            
            #### ⚠️ Limitations
            
            ⚠ Limited to AI/Data roles  
            ⚠ Medium match scores  
            ⚠ Dataset-dependent  
            ⚠ No collaborative filtering  
            
            #### 🚀 Future Improvements
            
            📌 Expand to web dev roles  
            📌 Add salary information  
            📌 Include location filters  
            📌 User feedback loop  
            📌 Hybrid recommendations  
            """)
        
        st.markdown("---")
        
        # System metrics
        st.markdown("#### 📊 System Statistics")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("""
            **Data Coverage**
            - Total Jobs: 15,000
            - Unique Titles: 20
            - Companies: 16
            """)
        
        with col2:
            st.markdown("""
            **Model Config**
            - Max Features: 5,000
            - N-gram Range: (1, 2)
            - Min DF: 2
            """)
        
        with col3:
            st.markdown("""
            **Performance**
            - Avg Response: <1 sec
            - Training Time: ~2 sec
            - Memory: Low
            """)
        
        st.markdown("---")
        
        # Feedback section
        st.markdown("#### 💬 Feedback & Support")
        
        st.info("""
        **Have suggestions or found a bug?**
        
        This is an academic project for career guidance. Your feedback helps improve the system!
        
        - 📧 Report issues or suggestions
        - 🌟 Rate your experience
        - 💡 Suggest new features
        """)
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("😊 Excellent", use_container_width=True):
                st.success("Thanks for the feedback!")
        
        with col2:
            if st.button("😐 Good", use_container_width=True):
                st.info("We'll keep improving!")
        
        with col3:
            if st.button("😞 Needs Work", use_container_width=True):
                st.warning("Sorry! We're working on it.")

# ============================================================================
# RUN APP
# ============================================================================
from fastapi import FastAPI
app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "AI Career Guidance Platform is running."}



@app.post("/recommend")
def recommend_jobs(user_skills: str, desired_role: str = "", top_k: int = 5, min_score: float = 0.0):
    df = load_data()
    system, _ = load_model(df)
    recommendations = system.recommend(
        user_skills=user_skills,
        desired_role=desired_role,
        top_k=top_k,
        min_score=min_score,
        return_job_ids=True
    )
    return recommendations.to_dict(orient="records")

if __name__ == "__main__":
    # main()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



