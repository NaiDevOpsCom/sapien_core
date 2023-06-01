pipeline{
    agent any
    options {
        // This is required if you want to clean before build
        skipDefaultCheckout(true)
    }
    stages{
        stage('Deploy'){
            steps{
                cleanWs()
                checkout scm
                sh "sudo rm -rf /home/ubuntu/sapien_core/*"
                sh "sudo cp -r ${WORKSPACE}/* /home/ubuntu/sapien_core/"
                sh "sudo chmod +x /home/ubuntu/sapien_core/start_script.sh"
                sh "sudo /home/ubuntu/sapien_core/start_script.sh"
            }
        }
    }
    post { 
        failure { 
            echo 'Deployment Failed'
        }
        success { 
            echo 'Deployment Successful'
        }
        unstable { 
            echo 'Deployment Unstable'
        }
    }
}